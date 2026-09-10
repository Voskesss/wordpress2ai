import Image from "next/image";

type Onderwerp = "ondernemer" | "websitebeheer" | "meubelmaker-lamp";
const omschrijvingen: Record<Onderwerp, string> = {
  ondernemer: "Ondernemer werkt aan haar website in een atelier",
  websitebeheer: "Ondernemer werkt geconcentreerd aan haar website",
  "meubelmaker-lamp":
    "Meubelmaker fotografeert zijn nieuwe houten lamp voor zijn website",
};

export default function VerhaalBeeld({ onderwerp }: { onderwerp: Onderwerp }) {
  return (
    <figure className="verhaal-beeld">
      <Image
        src={`/images/illustraties/${onderwerp}.webp`}
        alt={`AI-illustratie: ${omschrijvingen[onderwerp]}`}
        width={1536}
        height={1024}
        sizes="(max-width: 767px) 100vw, (max-width: 1200px) 70vw, 800px"
      />
      <figcaption>AI-illustratie van een gebruikssituatie</figcaption>
    </figure>
  );
}
