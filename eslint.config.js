import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'data/', 'dist/', 'public/swipe.js', 'public/finish.js'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
