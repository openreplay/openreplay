// swift-tools-version: 5.8
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "ORTracker",
    platforms: [
            .iOS(.v13)
        ],
    products: [
        // Products define the executables and libraries a package produces, and make them visible to other packages.
        .library(
            name: "ORTracker",
            targets: ["ORTracker"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/devicekit/DeviceKit.git", from: "4.0.0"),
        .package(url: "https://github.com/tsolomko/SWCompression.git", .upToNextMajor(from: "4.8.5")),
    ],
    targets: [
        // Targets are the basic building blocks of a package. A target can define a module or a test suite.
        // Targets can depend on other targets in this package, and on products in packages this package depends on.
        .target(
            name: "ORTracker",
            dependencies: [
                .product(name: "SWCompression", package: "SWCompression"),
                .product(name: "DeviceKit", package: "DeviceKit"),
                
            ]
        ),
        .testTarget(
            name: "ORTrackerTests",
            dependencies: ["ORTracker"]
        ),
    ]
)
