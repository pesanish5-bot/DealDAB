import type { Business } from "./types";

export const demoBusinesses: Business[] = [
  {
    id: "campusprint-demo",
    name: "CampusPrint Studio",
    fictional: true,
    location: "North Campus",
    negotiationProfile: {
      startingPriceInr: 14_800,
      minimumPriceInr: 12_900,
      deliveryAt: "2026-10-16T07:30:00+05:30",
      benefits: ["digital proof", "50 extra flyers"],
      conditions: ["artwork locked before 6 PM"],
      concessionSteps: [13_700, 12_900],
    },
  },
  {
    id: "quickink-demo",
    name: "QuickInk Express",
    fictional: true,
    location: "City Centre",
    negotiationProfile: {
      startingPriceInr: 12_200,
      minimumPriceInr: 11_800,
      deliveryAt: "2026-10-16T11:00:00+05:30",
      benefits: ["digital proof"],
      conditions: ["full payment before production"],
      concessionSteps: [11_800],
    },
  },
  {
    id: "pixelpress-demo",
    name: "PixelPress Works",
    fictional: true,
    location: "East Market",
    negotiationProfile: {
      startingPriceInr: 13_600,
      minimumPriceInr: 12_400,
      deliveryAt: "2026-10-16T08:00:00+05:30",
      benefits: ["digital proof", "one colour-correction reprint"],
      conditions: ["approved proof returned before 7 PM"],
      concessionSteps: [12_900, 12_400],
    },
  },
];
