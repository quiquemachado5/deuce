import type { Photo } from "@/lib/imagery";

const grandSlamDetailPhotos: Record<string, Photo> = {
  "US Open": {
    src: "/images/tournaments/detail/us-open-arthur-ashe.webp",
    alt: "Panorámica del Arthur Ashe Stadium durante el US Open",
    credit: "Alexisrael · CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Arthur_Ashe_Stadium_View.JPG",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    objectPosition: "50% 58%",
    mobileObjectPosition: "50% 50%",
  },
  Wimbledon: {
    src: "/images/tournaments/detail/wimbledon-centre-court.webp",
    alt: "Centre Court de Wimbledon durante el torneo",
    credit: "Richard Lewis · CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:The_Centre_Court,_Wimbledon.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    objectPosition: "50% 48%",
    mobileObjectPosition: "52% 44%",
  },
  "Roland Garros": {
    src: "/images/tournaments/detail/roland-garros-chatrier.webp",
    alt: "Court Philippe-Chatrier de Roland Garros",
    credit: "Arne Müseler · CC BY-SA 3.0 DE",
    source: "https://commons.wikimedia.org/wiki/File:Paris_Court_Philippe-Chatrier.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/de/",
    objectPosition: "50% 52%",
    mobileObjectPosition: "53% 48%",
  },
  "Australian Open": {
    src: "/images/tournaments/detail/australian-open-rod-laver.webp",
    alt: "Rod Laver Arena durante el Australian Open",
    credit: "Pat Mariboe · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Rod_Laver_Arena_2020_Aus_Open.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    objectPosition: "50% 52%",
    mobileObjectPosition: "52% 49%",
  },
};

const grandSlamFeaturePhotos: Record<string, Photo> = {
  "US Open": {
    src: "/images/tournaments/detail/us-open-roof.webp",
    alt: "Arthur Ashe Stadium con la cubierta retráctil del US Open",
    credit: "Richiekim · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Arthur_Ashe_Stadium_with_retractible_roof.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    objectPosition: "50% 48%",
    mobileObjectPosition: "54% 50%",
  },
  Wimbledon: {
    src: "/images/tournaments/detail/wimbledon-centre-court-detail.webp",
    alt: "Detalle del Centre Court de Wimbledon",
    credit: "Bonoahx · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Right_side_of_Centre_Court,_Wimbledon.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    objectPosition: "50% 47%",
    mobileObjectPosition: "50% 44%",
  },
  "Roland Garros": {
    src: "/images/tournaments/detail/roland-garros-match.webp",
    alt: "Court Philippe-Chatrier durante Roland Garros 2023",
    credit: "Remi Mathis · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Roland_Garros_2023_-_court_central_-_Zverev-Molcan_01.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    objectPosition: "50% 52%",
    mobileObjectPosition: "50% 48%",
  },
  "Australian Open": {
    src: "/images/tournaments/detail/australian-open-final.webp",
    alt: "Rod Laver Arena preparada para una final del Australian Open",
    credit: "CityBoy777 · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Rod_Laver_Arena_before_the_2025_Australian_Open_Women%27s_Doubles_Final_-_26_January_2025.jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    objectPosition: "50% 50%",
    mobileObjectPosition: "50% 48%",
  },
};

export function tournamentDetailPhoto(tournament: string) {
  return grandSlamDetailPhotos[tournament] || null;
}

export function tournamentDetailFeaturePhoto(tournament: string) {
  return grandSlamFeaturePhotos[tournament] || null;
}
