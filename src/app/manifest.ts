import type { MetadataRoute } from "next";

// Lets people "add to home screen" / save to device with a proper name.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kentucky Venues Work Order Status",
    short_name: "Work Orders",
    description: "Live status of creative team project requests.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0284c7",
  };
}
