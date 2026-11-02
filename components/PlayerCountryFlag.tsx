import { Flag } from "lucide-react";
import { countryLabel, playerBiography } from "@/lib/player-bio";
import PlayerFlag from "@/components/PlayerFlag";

export default function PlayerCountryFlag({ name, tour = 'atp' }: { name: string; tour?: 'atp'|'wta' }) {
  const country = playerBiography(name,tour)?.country;
  if (!country) {
    return (
      <span className="player-country-badge player-country-badge-missing" role="img" aria-label="País no disponible">
        <Flag size={13} strokeWidth={1.7} aria-hidden="true" />
      </span>
    );
  }

  const label = countryLabel(country);
  return (
    <span className="player-country-badge" role="img" aria-label={label} title={label}>
      <PlayerFlag code={country} />
    </span>
  );
}
