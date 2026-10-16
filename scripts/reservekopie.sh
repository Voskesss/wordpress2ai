#!/usr/bin/env bash
# Nachtelijke reservekopie van WordSwap naar OVH Object Storage, buiten GitHub,
# Cloudflare en Vercel om. Draait op de Mac van Jos (launchd, 03:17) en HAALT
# alles op met alleen-lezen-sleutels uit de sleutelhanger (Keychain).
#
# Wat erin gaat:
#   repos/<eigenaar>/<repo>.bundle   volledige git-historie (git clone x.bundle)
#   r2/<bucket>/...                  alle sitebestanden en media uit R2
#   dns/<domein>.txt                 zone-bestanden uit Cloudflare
#   db/wordswap.dump.enc             productie-database (versleuteld)
#   db/clerk-gebruikers.jsonl.enc    wie er een account heeft (versleuteld)
#   geheimen/omgeving.tar.enc        .env-bestanden (versleuteld)
#
# De OVH-bucket heeft Object Lock (compliance, 90 dagen) en houdt oude versies
# 120 dagen bij: ook met onze sleutel kan niemand de kopie wissen.
# Herstellen: zie LEESMIJ.txt in de bucket (hieronder meegeschreven).
#
# Gebruik: scripts/reservekopie.sh            (alles)
#          scripts/reservekopie.sh --geen-upload  (alleen lokaal bijwerken)

set -Eeuo pipefail
export PATH="/opt/homebrew/opt/libpq/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
BASIS="$HOME/WordSwap-reservekopie"
WERK="$BASIS/werk"          # git-mirrors en tussenstanden, gaat niet naar OVH
UPLOAD="$BASIS/upload"      # precies wat er in de bucket komt
LOGMAP="$BASIS/log"
STAAT="$BASIS/staat"        # tellingen van de vorige run (voor de verdwijn-rem)
REM_PROCENT=80              # minder dan 80% van vorige keer = verdacht, niet uploaden

# Waar de kopie staat (bucket, adressen) staat bewust niet in git maar in
# $BASIS/instellingen.sh: BUCKET, OVH_ENDPOINT, OVH_REGIO, R2_ACCOUNT, R2_BUCKET, GH_ORG.
if [ ! -f "$BASIS/instellingen.sh" ]; then
  echo "MISLUKT: $BASIS/instellingen.sh ontbreekt" | tee "$BASIS/status.txt" 2>/dev/null; exit 1
fi
# shellcheck source=/dev/null
source "$BASIS/instellingen.sh"

UPLOADEN=1
[ "${1:-}" = "--geen-upload" ] && UPLOADEN=0

mkdir -p "$WERK/repos" "$UPLOAD"/{repos,r2,dns,db,geheimen} "$LOGMAP" "$STAAT"
LOG="$LOGMAP/$(date +%Y-%m-%d).log"
exec > >(tee -a "$LOG") 2>&1
echo "=== reservekopie $(date '+%Y-%m-%d %H:%M:%S') ==="

WAARSCHUWINGEN=()
waarschuw() { echo "LET OP: $*"; WAARSCHUWINGEN+=("$*"); }
melding() { osascript -e "display notification \"$1\" with title \"WordSwap-reservekopie\"" >/dev/null 2>&1 || true; }
fout() {
  echo "MISLUKT: $*"
  echo "MISLUKT $(date '+%Y-%m-%d %H:%M') $*" > "$BASIS/status.txt"
  melding "Mislukt: $*"
  exit 1
}
trap 'fout "onverwachte fout op regel $LINENO"' ERR

sleutel() { security find-generic-password -a wordswap -s "$1" -w 2>/dev/null; }
heeft_sleutel() { security find-generic-password -a wordswap -s "$1" >/dev/null 2>&1; }

# Verdwijn-rem: is een telling ineens veel lager dan vorige keer, dan is er
# mogelijk iets gewist bij de bron. Dan niet overschrijven, wel alarm slaan.
rem_ok() {
  local naam="$1" nu="$2" vorig
  vorig="$(cat "$STAAT/$naam" 2>/dev/null || echo 0)"
  if [ "$vorig" -gt 0 ] && [ $((nu * 100)) -lt $((vorig * REM_PROCENT)) ]; then
    return 1
  fi
  return 0
}

versleutel() { # bron doel
  WACHTWOORD="$VERSLEUTELING" openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt \
    -pass env:WACHTWOORD -in "$1" -out "$2"
}

heeft_sleutel reservekopie-versleuteling || fout "wachtwoordzin reservekopie-versleuteling ontbreekt in de sleutelhanger"
VERSLEUTELING="$(sleutel reservekopie-versleuteling)"

# ---------- 1. Git-repo's ----------
repos_van() { # token api-pad -> regels "eigenaar/naam"
  local token="$1" pad="$2" pagina=1 antwoord teken="?"
  [[ "$pad" == *\?* ]] && teken="&"
  while :; do
    antwoord="$(curl -fsS -H "Authorization: Bearer $token" -H "Accept: application/vnd.github+json" \
      "https://api.github.com/$pad${teken}per_page=100&page=$pagina")"
    [ "$(jq length <<<"$antwoord")" -eq 0 ] && break
    jq -r '.[].full_name' <<<"$antwoord"
    pagina=$((pagina + 1))
  done
}

spiegel_repo() { # token eigenaar/naam
  local token="$1" volnaam="$2" m bundel refs vorige header
  m="$WERK/repos/$volnaam.git"
  bundel="$UPLOAD/repos/$volnaam.bundle"
  header="Authorization: Basic $(printf 'x-access-token:%s' "$token" | base64)"
  mkdir -p "$(dirname "$m")" "$(dirname "$bundel")"
  if [ -d "$m" ]; then
    # Geen --prune: een branch die bij GitHub verdwijnt, blijft hier bestaan.
    git -C "$m" -c http.extraHeader="$header" fetch --quiet origin || { waarschuw "ophalen $volnaam mislukt"; return; }
  else
    git -c http.extraHeader="$header" clone --quiet --mirror "https://github.com/$volnaam.git" "$m" \
      || { waarschuw "kopiëren $volnaam mislukt"; return; }
  fi
  refs="$(git -C "$m" for-each-ref | shasum | cut -c1-40)"
  vorige="$(cat "$m/reservekopie-refs" 2>/dev/null || true)"
  if [ "$refs" != "$vorige" ] || [ ! -f "$bundel" ]; then
    if [ -z "$(git -C "$m" for-each-ref)" ]; then
      echo "  $volnaam: leeg, overgeslagen"; return
    fi
    git -C "$m" bundle create "$bundel.tmp" --all --quiet 2>/dev/null || git -C "$m" bundle create "$bundel.tmp" --all
    mv "$bundel.tmp" "$bundel"
    echo "$refs" > "$m/reservekopie-refs"
    echo "  $volnaam: bijgewerkt"
  fi
}

echo "--- repo's"
REPOS_TOTAAL=0
for bron in org eigen; do
  if [ "$bron" = org ]; then naam=reservekopie-github; pad="orgs/$GH_ORG/repos?type=all"
  else naam=reservekopie-github-eigen; pad="user/repos?affiliation=owner"; fi
  if ! heeft_sleutel "$naam"; then waarschuw "sleutel $naam ontbreekt, $bron-repo's overgeslagen"; continue; fi
  token="$(sleutel "$naam")"
  lijst="$(repos_van "$token" "$pad")" || { waarschuw "repo-lijst $bron niet op te halen"; continue; }
  aantal="$(grep -c . <<<"$lijst" || true)"
  echo "$bron: $aantal repo's"
  if ! rem_ok "repos-$bron" "$aantal"; then
    fout "verdwijn-rem: $bron heeft nu $aantal repo's, vorige keer $(cat "$STAAT/repos-$bron"). Niets overschreven."
  fi
  while read -r volnaam; do [ -n "$volnaam" ] && spiegel_repo "$token" "$volnaam"; done <<<"$lijst"
  echo "$aantal" > "$STAAT/repos-$bron.nieuw"
  REPOS_TOTAAL=$((REPOS_TOTAAL + aantal))
done

# ---------- 2. R2 (sitebestanden en media) ----------
echo "--- R2"
export RCLONE_CONFIG_R2_TYPE=s3 RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ENDPOINT="https://$R2_ACCOUNT.r2.cloudflarestorage.com"
RCLONE_CONFIG_R2_ACCESS_KEY_ID="$(sleutel reservekopie-r2-access)"; export RCLONE_CONFIG_R2_ACCESS_KEY_ID
RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$(sleutel reservekopie-r2-secret)"; export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY
R2_AANTAL="$(rclone size "r2:$R2_BUCKET" --fast-list --json 2>/dev/null | jq .count)"
[[ "$R2_AANTAL" =~ ^[0-9]+$ ]] || fout "R2 niet bereikbaar (sleutel reservekopie-r2-*)"
echo "R2: $R2_AANTAL bestanden"
rem_ok r2 "$R2_AANTAL" || fout "verdwijn-rem: R2 heeft nu $R2_AANTAL bestanden, vorige keer $(cat "$STAAT/r2"). Niets overschreven."
rclone sync "r2:$R2_BUCKET" "$UPLOAD/r2/$R2_BUCKET" --fast-list --transfers 16 --stats-one-line --stats 0 -q

# ---------- 3. DNS-zones ----------
echo "--- DNS"
DNS_TOKEN="$(sleutel reservekopie-cf-dns)"
ZONES="$(curl -fsS -H "Authorization: Bearer $DNS_TOKEN" "https://api.cloudflare.com/client/v4/zones?per_page=50" \
  | jq -r '.result[] | "\(.id) \(.name)"')"
DNS_AANTAL="$(grep -c . <<<"$ZONES" || true)"
echo "DNS: $DNS_AANTAL zones"
rem_ok dns "$DNS_AANTAL" || fout "verdwijn-rem: nu $DNS_AANTAL DNS-zones, vorige keer $(cat "$STAAT/dns"). Niets overschreven."
while read -r id domein; do
  [ -z "$id" ] && continue
  nieuw="$WERK/dns-$domein.txt"
  curl -fsS -H "Authorization: Bearer $DNS_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones/$id/dns_records/export" > "$nieuw" \
    || { waarschuw "DNS-export $domein mislukt"; continue; }
  # Alleen vervangen als de records echt anders zijn (de kop bevat een tijdstempel).
  if ! diff -q <(grep -v '^;' "$nieuw") <(grep -v '^;' "$UPLOAD/dns/$domein.txt" 2>/dev/null) >/dev/null; then
    mv "$nieuw" "$UPLOAD/dns/$domein.txt"; echo "  $domein: bijgewerkt"
  fi
done <<<"$ZONES"

# ---------- 4. Database ----------
echo "--- database"
DB_URL="$(grep -E '^DATABASE_URL_UNPOOLED=' "$PROJECT/.env.local" | head -1 | cut -d= -f2- | tr -d '"')"
[ -n "$DB_URL" ] || fout "DATABASE_URL_UNPOOLED niet gevonden in .env.local"
pg_dump --format=custom --no-owner --no-privileges --file="$WERK/wordswap.dump" "$DB_URL"
versleutel "$WERK/wordswap.dump" "$UPLOAD/db/wordswap.dump.enc"
rm -f "$WERK/wordswap.dump"
echo "database: $(du -h "$UPLOAD/db/wordswap.dump.enc" | cut -f1)"

# ---------- 4b. Clerk-gebruikers ----------
# Wachtwoorden geeft Clerk nooit vrij; wel wie er is (id, e-mail, naam). Nodig om
# klanten na een herstart aan hun account in de database te koppelen.
echo "--- Clerk"
CLERK_KEY="$(grep -E '^CLERK_SECRET_KEY=' "$PROJECT/.env.local" | head -1 | cut -d= -f2- | tr -d '"')"
if [ -n "$CLERK_KEY" ]; then
  : > "$WERK/clerk.jsonl"
  offset=0
  while :; do
    pagina="$(curl -fsS -H "Authorization: Bearer $CLERK_KEY" "https://api.clerk.com/v1/users?limit=500&offset=$offset&order_by=created_at")" \
      || { waarschuw "Clerk-export mislukt"; break; }
    n="$(jq length <<<"$pagina")"
    jq -c '.[] | {id, email: [.email_addresses[].email_address], voornaam: .first_name, achternaam: .last_name,
      telefoon: [.phone_numbers[].phone_number], aangemaakt: .created_at, laatst_ingelogd: .last_sign_in_at,
      public_metadata, private_metadata}' <<<"$pagina" >> "$WERK/clerk.jsonl"
    [ "$n" -lt 500 ] && break
    offset=$((offset + 500))
  done
  echo "Clerk: $(grep -c . "$WERK/clerk.jsonl" || true) gebruikers"
  versleutel "$WERK/clerk.jsonl" "$UPLOAD/db/clerk-gebruikers.jsonl.enc"
  rm -f "$WERK/clerk.jsonl"
else
  waarschuw "CLERK_SECRET_KEY niet gevonden in .env.local, Clerk overgeslagen"
fi

# ---------- 5. Geheimen ----------
echo "--- geheimen"
GEHEIM_BESTANDEN=()
for f in .env.local .env.development.local envpreview; do
  [ -f "$PROJECT/$f" ] && GEHEIM_BESTANDEN+=("$f")
done
geheim_hash="$(cd "$PROJECT" && cat "${GEHEIM_BESTANDEN[@]}" | shasum | cut -c1-40)"
if [ "$geheim_hash" != "$(cat "$STAAT/geheimen" 2>/dev/null || true)" ] || [ ! -f "$UPLOAD/geheimen/omgeving.tar.enc" ]; then
  tar -C "$PROJECT" -cf "$WERK/omgeving.tar" "${GEHEIM_BESTANDEN[@]}"
  versleutel "$WERK/omgeving.tar" "$UPLOAD/geheimen/omgeving.tar.enc"
  rm -f "$WERK/omgeving.tar"
  echo "$geheim_hash" > "$STAAT/geheimen"
  echo "geheimen: bijgewerkt (${GEHEIM_BESTANDEN[*]})"
fi

# ---------- 5b. The Last Farewell (eigen project van Jos) ----------
# Code zit al bij de repo's (Voskesss/farewell). Hier: productie-database,
# Clerk-gebruikers en de uploads van families in Vercel Blob. Draait alleen als
# de sleutels reservekopie-farewell-* in de sleutelhanger staan.
if heeft_sleutel reservekopie-farewell-db; then
  echo "--- farewell"
  mkdir -p "$UPLOAD/farewell/blob"
  # Het invoervenster van `security -w` knipt af op 128 tekens; een half
  # meegekomen parameter (bv. "&channel_b") halen we weg, sslmode blijft staan.
  FW_DB="$(sleutel reservekopie-farewell-db | sed -E 's/[?&][^=&]*$//')"
  pg_dump --format=custom --no-owner --no-privileges --file="$WERK/farewell.dump" "$FW_DB"
  versleutel "$WERK/farewell.dump" "$UPLOAD/farewell/database.dump.enc"
  rm -f "$WERK/farewell.dump"
  echo "farewell-database: $(du -h "$UPLOAD/farewell/database.dump.enc" | cut -f1)"

  if heeft_sleutel reservekopie-farewell-clerk; then
    FW_CLERK="$(sleutel reservekopie-farewell-clerk)"
    : > "$WERK/fw-clerk.jsonl"; offset=0
    while :; do
      pagina="$(curl -fsS -H "Authorization: Bearer $FW_CLERK" "https://api.clerk.com/v1/users?limit=500&offset=$offset&order_by=created_at")" \
        || { waarschuw "farewell-Clerk-export mislukt"; break; }
      jq -c '.[] | {id, email: [.email_addresses[].email_address], voornaam: .first_name, achternaam: .last_name,
        aangemaakt: .created_at, laatst_ingelogd: .last_sign_in_at, public_metadata, private_metadata}' <<<"$pagina" >> "$WERK/fw-clerk.jsonl"
      [ "$(jq length <<<"$pagina")" -lt 500 ] && break
      offset=$((offset + 500))
    done
    echo "farewell-Clerk: $(grep -c . "$WERK/fw-clerk.jsonl" || true) gebruikers"
    versleutel "$WERK/fw-clerk.jsonl" "$UPLOAD/farewell/clerk-gebruikers.jsonl.enc"
    rm -f "$WERK/fw-clerk.jsonl"
  fi

  if heeft_sleutel reservekopie-farewell-blob; then
    FW_BLOB="$(sleutel reservekopie-farewell-blob)"
    : > "$WERK/fw-blob.lijst"; cursor=""; lijst_heel=1
    while :; do
      # Zonder x-api-version weigert de API vervolgpagina's (400).
      pagina="$(curl -fsS --retry 3 -H "Authorization: Bearer $FW_BLOB" -H "x-api-version: 12" \
        "https://blob.vercel-storage.com/?limit=1000${cursor:+&cursor=$(jq -rn --arg c "$cursor" '$c|@uri')}")" \
        || { waarschuw "farewell-Blob-lijst onvolledig"; lijst_heel=0; break; }
      jq -r '.blobs[] | "\(.size)\t\(.pathname)\t\(.downloadUrl // .url)"' <<<"$pagina" >> "$WERK/fw-blob.lijst"
      [ "$(jq -r .hasMore <<<"$pagina")" = true ] || break
      cursor="$(jq -r .cursor <<<"$pagina")"
    done
    FW_AANTAL="$(grep -c . "$WERK/fw-blob.lijst" || true)"
    echo "farewell-Blob: $FW_AANTAL bestanden"
    rem_ok farewell-blob "$FW_AANTAL" || fout "verdwijn-rem: farewell-Blob heeft nu $FW_AANTAL bestanden, vorige keer $(cat "$STAAT/farewell-blob"). Niets overschreven."
    # Al binnen met dezelfde grootte: overslaan (uploads veranderen niet).
    : > "$WERK/fw-blob.tehalen"
    while IFS=$'\t' read -r grootte pad url; do
      doel="$UPLOAD/farewell/blob/$pad"
      [ -f "$doel" ] && [ "$(stat -f%z "$doel")" = "$grootte" ] && continue
      printf '%s\t%s\n' "$pad" "$url" >> "$WERK/fw-blob.tehalen"
    done < "$WERK/fw-blob.lijst"
    haal_blob() {
      local pad url doel
      IFS=$'\t' read -r pad url <<<"$1"
      doel="$UPLOAD/farewell/blob/$pad"
      mkdir -p "$(dirname "$doel")"
      curl -fsS --retry 3 --max-time 900 -H "Authorization: Bearer $FW_BLOB" -o "$doel.tmp" "$url" \
        && mv "$doel.tmp" "$doel" || { rm -f "$doel.tmp"; echo "$pad"; }
    }
    export -f haal_blob; export FW_BLOB UPLOAD
    tr '\n' '\0' < "$WERK/fw-blob.tehalen" | xargs -0 -P 8 -n 1 bash -c 'haal_blob "$1"' _ > "$WERK/fw-blob.mis" || true
    mis="$(grep -c . "$WERK/fw-blob.mis" || true)"
    echo "farewell-Blob: $(( $(grep -c . "$WERK/fw-blob.tehalen" || true) - mis )) nieuw opgehaald"
    if [ "$mis" -gt 0 ]; then waarschuw "$mis farewell-bestand(en) niet op te halen (zie werk/fw-blob.mis)"; fi
    # Alleen een volledige telling vastleggen, anders ijkt de rem op een halve lijst.
    if [ "$lijst_heel" = 1 ]; then echo "$FW_AANTAL" > "$STAAT/farewell-blob.nieuw"; fi
  fi
fi

# ---------- 6. Herstel-instructies ----------
cp "$PROJECT/scripts/reservekopie-LEESMIJ.txt" "$UPLOAD/LEESMIJ.txt"
# Het script zelf gaat ook mee: zonder Mac en zonder GitHub moet je het terug kunnen zetten.
mkdir -p "$UPLOAD/script"
cp "$PROJECT/scripts/reservekopie.sh" "$PROJECT/scripts/nl.wordswap.reservekopie.plist" "$BASIS/instellingen.sh" "$UPLOAD/script/"

# ---------- 7. Naar OVH ----------
if [ "$UPLOADEN" = 1 ]; then
  echo "--- upload naar OVH"
  export RCLONE_CONFIG_OVH_TYPE=s3 RCLONE_CONFIG_OVH_PROVIDER=OVHcloud
  export RCLONE_CONFIG_OVH_ENDPOINT="$OVH_ENDPOINT" RCLONE_CONFIG_OVH_REGION="$OVH_REGIO"
  RCLONE_CONFIG_OVH_ACCESS_KEY_ID="$(sleutel reservekopie-ovh-access)"; export RCLONE_CONFIG_OVH_ACCESS_KEY_ID
  RCLONE_CONFIG_OVH_SECRET_ACCESS_KEY="$(sleutel reservekopie-ovh-secret)"; export RCLONE_CONFIG_OVH_SECRET_ACCESS_KEY
  jq -n --arg tijd "$(date -u +%FT%TZ)" --argjson repos "$REPOS_TOTAAL" --argjson r2 "$R2_AANTAL" \
    --argjson dns "$DNS_AANTAL" --argjson waarschuwingen "$(printf '%s\n' "${WAARSCHUWINGEN[@]:-}" | jq -R . | jq -s 'map(select(. != ""))')" \
    '{tijd: $tijd, repos: $repos, r2_bestanden: $r2, dns_zones: $dns, waarschuwingen: $waarschuwingen}' > "$UPLOAD/laatste-run.json"
  rclone sync "$UPLOAD" "ovh:$BUCKET" --checksum --fast-list --transfers 16 --exclude "proef/**" --exclude ".DS_Store" -q
fi

# Pas na een geslaagde run de tellingen vastleggen.
for f in "$STAAT"/*.nieuw; do [ -f "$f" ] && mv "$f" "${f%.nieuw}"; done
echo "$R2_AANTAL" > "$STAAT/r2"
echo "$DNS_AANTAL" > "$STAAT/dns"

trap - ERR
if [ ${#WAARSCHUWINGEN[@]} -gt 0 ]; then
  echo "GELUKT MET WAARSCHUWINGEN $(date '+%Y-%m-%d %H:%M'): ${WAARSCHUWINGEN[*]}" > "$BASIS/status.txt"
  melding "Gelukt, met ${#WAARSCHUWINGEN[@]} waarschuwing(en). Zie $BASIS/status.txt"
else
  echo "GELUKT $(date '+%Y-%m-%d %H:%M')" > "$BASIS/status.txt"
fi
echo "=== klaar $(date '+%H:%M:%S') ==="
find "$LOGMAP" -name '*.log' -mtime +60 -delete
