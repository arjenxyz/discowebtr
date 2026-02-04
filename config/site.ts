export const siteConfig = {
  name: "DiscoWeb",
  hero: {
    badge: "Beta",
    title: "Discord Sunucu Yönetim Paneli",
    description: "Özel Discord sunucuları için geliştirilmiş, yapay zeka destekli gelişmiş yönetim platformu.",
    cta: "Panele Git",
  },
  bot: {
    inviteUrl: process.env.NEXT_PUBLIC_DISCORD_BOT_INVITE || "https://discord.com/api/oauth2/authorize?client_id=1465696408656023698&permissions=8&scope=bot",
    name: "Discord Yönetim Botu",
    description: "Gelişmiş Discord yönetim botu"
  },
  links: {
    docs: "https://discowebtr.vercel.app/docs",
    support: "https://discord.gg/3Y6YNwdE5Q",
    github: "https://github.com/discnexus"
  }
};
