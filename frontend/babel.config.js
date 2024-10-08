module.exports = {
    "presets": [
        "@babel/preset-env",
        "@babel/preset-react",
        "@babel/preset-typescript"
    ],
    "plugins": [
        "babel-plugin-react-require",
        ["@babel/plugin-transform-private-property-in-object", { "loose":true } ],
        [ "@babel/plugin-transform-runtime", { "regenerator": true } ],
        [ "@babel/plugin-proposal-decorators", { "legacy":true } ],
        [ "@babel/plugin-transform-class-properties", { "loose":true } ],
        [ "@babel/plugin-transform-private-methods", { "loose": true }],
        ["prismjs", {
            "languages": ["javascript", "css", "bash", "typescript", "jsx", "kotlin", "swift"],
            "theme": "default",
            "css": true
        }]
    ]
}