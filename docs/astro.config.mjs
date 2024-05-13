import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc'

export default defineConfig({
  site: "https://pawnote.js.org",

  integrations: [
    starlight({
      title: "Pawnote",

      social: {
        github: "https://github.com/LiterateInk/Pawnote"
      },

      editLink: {
        baseUrl: "https://github.com/LiterateInk/Pawnote/edit/main/docs/"
      },

      plugins: [
        // Generate the documentation.
        starlightTypeDoc({
          entryPoints: ['../src/index.ts'],
          tsconfig: '../tsconfig.json'
        }),
      ],

      sidebar: [
        {
          label: "Guides",
          autogenerate: {
            directory: "guides"
          }
        },
        {
          label: "Contributing",
          autogenerate: {
            directory: "contributing"
          }
        },
        {
          label: "Pronote Internals",
          autogenerate: {
            directory: "pronote-internals"
          }
        },
        typeDocSidebarGroup
      ],

      defaultLocale: "root",
      locales: {
        root: {
          lang: "en",
          label: "English"
        },
        fr: {
          lang: "fr",
          label: "Français"
        }
      },

      customCss: [
        "@fontsource/comfortaa/400.css",
        "@fontsource/comfortaa/600.css",
        "./src/styles/tailwind.css"
      ]
    }),

    tailwind({
      applyBaseStyles: false
    })
  ]
});
