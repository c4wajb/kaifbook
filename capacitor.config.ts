import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.kaifbook.app",
  appName: "Kaifbook",
  webDir: "public",
  server: {
    url: "https://www.stolix.ru",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "www.stolix.ru",
      "stolix.ru",
      "kaifbook.ru",
      "www.kaifbook.ru",
      "id.vk.ru",
      "vk.com",
      "www.vk.com",
      "max.ru",
      "www.max.ru",
    ],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
