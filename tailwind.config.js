/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./index.html"],
  darkMode: "class",
  theme: {
      extend: {
          colors: {
              "background": "#131313",
              "surface-container": "#1f2020",
              "surface-dim": "#131313",
              "on-tertiary-fixed": "#002020",
              "surface-bright": "#393939",
              "on-secondary": "#402d00",
              "surface-variant": "#353535",
              "on-tertiary-fixed-variant": "#004f51",
              "primary": "#ffb4a8",
              "on-primary-container": "#ff907f",
              "inverse-primary": "#b52619",
              "tertiary-fixed-dim": "#2ddbde",
              "secondary": "#f6be3b",
              "on-secondary-fixed-variant": "#5c4300",
              "primary-container": "#8b0000",
              "on-surface-variant": "#e3beb8",
              "tertiary-container": "#004b4c",
              "on-error-container": "#ffdad6",
              "primary-fixed": "#ffdad4",
              "on-background": "#e4e2e1",
              "on-tertiary": "#003738",
              "surface-container-highest": "#353535",
              "on-primary-fixed-variant": "#920703",
              "error-container": "#93000a",
              "outline": "#aa8984",
              "on-secondary-container": "#433000",
              "tertiary-fixed": "#5af8fb",
              "surface": "#131313",
              "surface-tint": "#ffb4a8",
              "secondary-fixed-dim": "#f6be3b",
              "on-tertiary-container": "#00c3c6",
              "primary-fixed-dim": "#ffb4a8",
              "tertiary": "#2ddbde",
              "inverse-surface": "#e4e2e1",
              "error": "#ffb4ab",
              "surface-container-high": "#2a2a2a",
              "on-surface": "#e4e2e1",
              "on-secondary-fixed": "#261900",
              "inverse-on-surface": "#303030",
              "surface-container-low": "#1b1c1c",
              "secondary-fixed": "#ffdea0",
              "outline-variant": "#5a403c",
              "on-error": "#690005",
              "surface-container-lowest": "#0e0e0e",
              "secondary-container": "#c69302",
              "on-primary-fixed": "#410000",
              "on-primary": "#690000"
          },
          borderRadius: {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
          },
          spacing: {
              "gutter": "16px",
              "pixel-unit": "4px",
              "panel-padding": "12px",
              "margin-edge": "32px"
          },
          fontFamily: {
              "label-caps": ["Courier Prime"],
              "body-sm": ["JetBrains Mono"],
              "headline-md": ["Space Grotesk"],
              "headline-lg": ["Space Grotesk"],
              "body-lg": ["JetBrains Mono"],
              "headline-lg-mobile": ["Space Grotesk"]
          },
          fontSize: {
              "label-caps": ["10px", { lineHeight: "12px", fontWeight: "700" }],
              "body-sm": ["12px", { lineHeight: "18px", fontWeight: "400" }],
              "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
              "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "0.05em", fontWeight: "700" }],
              "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
              "headline-lg-mobile": ["24px", { lineHeight: "30px", fontWeight: "700" }]
          }
      }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ]
}
