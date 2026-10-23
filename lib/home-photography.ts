import type { Photo } from "./imagery";

export const homeMaterials: { surface: "clay" | "grass" | "hard"; name: string; photo: Photo }[] = [
  { surface: "clay", name: "Tierra batida", photo: {
    src: "/images/home-materials/clay.webp", alt: "Textura de la tierra batida y sus líneas blancas", objectPosition: "50% 60%",
    credit: "Erwan Hesry · CC0", source: "https://commons.wikimedia.org/wiki/File:Tennis_line_markings_(Unsplash).jpg",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", photoYear: 2016,
    caption: "Plano de tierra batida. Versiones WebP redimensionadas del original; encuadre adaptable a la pantalla.",
  } },
  { surface: "grass", name: "Hierba", photo: {
    src: "/images/home-materials/grass.webp", alt: "Una pelota sobre la hierba de Queen’s Club", objectPosition: "50% 50%",
    credit: "Carine06 · CC BY-SA 2.0", source: "https://commons.wikimedia.org/wiki/File:Grass_court_season_is_here!_(18161963964).jpg",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", photoYear: 2015,
    caption: "Queen’s Club, 13 de junio de 2015. Versiones WebP redimensionadas, conservadas bajo CC BY-SA 2.0; encuadre adaptable a la pantalla.",
  } },
  { surface: "hard", name: "Dura", photo: {
    src: "/images/home-materials/hard.webp", alt: "Líneas de una pista dura azul bajo una sombra natural", objectPosition: "50% 70%",
    credit: "Mario Gogh · Unsplash", source: "https://unsplash.com/photos/a-shadow-of-a-tennis-player-on-a-tennis-court-u_3Q2NGyDzI",
    licenseUrl: "https://unsplash.com/license", photoYear: 2022,
    caption: "Brasília, 2022. Versiones WebP redimensionadas del original; encuadre adaptable a la pantalla.",
  } },
];
