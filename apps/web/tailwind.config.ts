import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b5998',
        secondary: '#c62828',
      },
    },
  },
  plugins: [],
};

export default config;
