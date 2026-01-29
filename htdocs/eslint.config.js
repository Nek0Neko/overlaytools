export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
        CustomEvent: "readonly",
        HTMLElement: "readonly",
        CSSStyleSheet: "readonly",
        DataView: "readonly",
        TextDecoder: "readonly",
        WebSocket: "readonly",
        Uint8Array: "readonly",
        Promise: "readonly",
        Map: "readonly",
        Set: "readonly"
      }
    },
    rules: {
      // Error prevention
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-console": "off",  // Allow console for debugging overlays
      
      // Code style
      "semi": ["error", "always"],
      "quotes": ["warn", "single", { "avoidEscape": true }],
      "indent": ["warn", 4, { "SwitchCase": 1 }],
      "comma-dangle": ["warn", "only-multiline"],
      
      // Best practices
      "eqeqeq": ["warn", "smart"],
      "no-var": "error",
      "prefer-const": "warn",
      "no-duplicate-imports": "error"
    }
  },
  {
    ignores: [
      "node_modules/**",
      "samples/**"
    ]
  }
];
