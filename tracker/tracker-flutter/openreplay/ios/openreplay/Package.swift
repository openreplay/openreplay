// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "openreplay",
    platforms: [.iOS("13.0")],
    products: [
        .library(name: "openreplay", targets: ["openreplay"])
    ],
    dependencies: [
        // Resolved by Flutter's generated package at build time.
        .package(name: "FlutterFramework", path: "../FlutterFramework")
    ],
    targets: [
        .target(
            name: "openreplay",
            dependencies: [
                .product(name: "FlutterFramework", package: "FlutterFramework")
            ]
        )
    ]
)
