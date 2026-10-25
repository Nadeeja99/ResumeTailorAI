import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

const token = (name: string) => `hsl(var(--${name}))`;

export default {
	darkMode: ["class"],
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
			screens: { "2xl": "1200px" },
		},
		extend: {
			fontFamily: {
				sans: ["Inter Variable", ...defaultTheme.fontFamily.sans],
			},
			colors: {
				border: token("border"),
				input: token("input"),
				ring: token("ring"),
				background: token("background"),
				foreground: token("foreground"),
				primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
				secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
				destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
				success: { DEFAULT: token("success"), foreground: token("success-foreground") },
				warning: { DEFAULT: token("warning"), foreground: token("warning-foreground") },
				muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
				accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
				popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
				card: { DEFAULT: token("card"), foreground: token("card-foreground") },
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},
	},
	plugins: [animate, typography],
} satisfies Config;
