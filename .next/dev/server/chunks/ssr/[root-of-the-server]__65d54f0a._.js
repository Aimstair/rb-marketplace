module.exports = [
"[externals]/@prisma/client [external] (@prisma/client, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("@prisma/client", () => require("@prisma/client"));

module.exports = mod;
}),
"[project]/rb-marketplace/lib/prisma.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs)");
;
const globalForPrisma = /*TURBOPACK member replacement*/ __turbopack_context__.g;
const prisma = globalForPrisma.prisma || new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__["PrismaClient"]({
    log: [
        "query"
    ]
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
}),
"[project]/rb-marketplace/app/actions/listings.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40105282f300ef5022879b2c5d5a4bb918dc10c113":"getAvailableGames","40fc12b29cad7f3b83501f2698d876b613877bb426":"getListings"},"",""] */ __turbopack_context__.s([
    "getAvailableGames",
    ()=>getAvailableGames,
    "getListings",
    ()=>getListings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/lib/prisma.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
async function getListings(filters = {}) {
    const { search = "", mainCategory = "All", selectedGame = "All Games", selectedItemType = "All", sortBy = "newest", priceRange = {
        min: 0,
        max: 1000000
    }, page = 1, itemsPerPage = 9 } = filters;
    try {
        // Build where clause
        const where = {
            status: "available"
        };
        // Search filter
        if (search) {
            where.OR = [
                {
                    title: {
                        contains: search,
                        mode: "insensitive"
                    }
                },
                {
                    seller: {
                        username: {
                            contains: search,
                            mode: "insensitive"
                        }
                    }
                }
            ];
        }
        // Category filter
        if (mainCategory === "Featured") {
            where.featured = true;
        } else if (mainCategory !== "All" && mainCategory !== "Accessories") {
            where.category = mainCategory;
        } else if (mainCategory === "Accessories") {
            where.category = "Accessories";
        }
        // Game filter
        if (selectedGame !== "All Games") {
            where.game = selectedGame;
        }
        // Item type filter (only for Games category)
        if (mainCategory === "Games" && selectedItemType !== "All") {
            where.itemType = selectedItemType;
        }
        // Price range filter
        where.price = {
            gte: priceRange.min,
            lte: priceRange.max
        };
        // Build order by
        let orderBy = {
            createdAt: "desc"
        };
        switch(sortBy){
            case "price-asc":
                orderBy = {
                    price: "asc"
                };
                break;
            case "price-desc":
                orderBy = {
                    price: "desc"
                };
                break;
            case "vouch":
                orderBy = {
                    vouchCount: "desc"
                };
                break;
            case "upvotes":
                orderBy = {
                    upvotes: "desc"
                };
                break;
            case "trending":
                // For trending, we'll use a combination of upvotes and recent creation
                orderBy = [
                    {
                        upvotes: "desc"
                    },
                    {
                        createdAt: "desc"
                    }
                ];
                break;
            default:
                orderBy = {
                    createdAt: "desc"
                };
        }
        // Get total count
        const total = await __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].listing.count({
            where
        });
        // Get paginated listings
        const listings = await __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].listing.findMany({
            where,
            include: {
                seller: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy,
            skip: (page - 1) * itemsPerPage,
            take: itemsPerPage
        });
        // Transform to response format
        const transformedListings = listings.map((listing)=>({
                id: listing.id,
                title: listing.title,
                game: listing.game,
                price: listing.price,
                image: listing.image,
                seller: {
                    id: listing.seller.id,
                    username: listing.seller.username
                },
                vouch: listing.vouchCount,
                status: listing.status,
                category: listing.category,
                itemType: listing.itemType,
                condition: listing.condition,
                upvotes: listing.upvotes,
                downvotes: listing.downvotes,
                featured: listing.featured
            }));
        const totalPages = Math.ceil(total / itemsPerPage);
        return {
            listings: transformedListings,
            total,
            totalPages,
            currentPage: page
        };
    } catch (error) {
        console.error("Error fetching listings:", error);
        throw new Error("Failed to fetch listings");
    }
}
async function getAvailableGames(mainCategory = "All") {
    try {
        if (mainCategory === "Accessories" || mainCategory === "Featured") {
            return [];
        }
        const games = await __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].listing.findMany({
            where: {
                status: "available",
                ...mainCategory !== "All" && {
                    category: mainCategory
                }
            },
            select: {
                game: true
            },
            distinct: [
                "game"
            ]
        });
        const gameList = games.map((g)=>g.game).filter((game)=>game !== "Roblox Catalog").sort();
        return [
            "All Games",
            ...gameList
        ];
    } catch (error) {
        console.error("Error fetching available games:", error);
        return [
            "All Games"
        ];
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getListings,
    getAvailableGames
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getListings, "40fc12b29cad7f3b83501f2698d876b613877bb426", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getAvailableGames, "40105282f300ef5022879b2c5d5a4bb918dc10c113", null);
}),
"[project]/rb-marketplace/.next-internal/server/app/marketplace/page/actions.js { ACTIONS_MODULE0 => \"[project]/rb-marketplace/app/actions/listings.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$app$2f$actions$2f$listings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/app/actions/listings.ts [app-rsc] (ecmascript)");
;
;
}),
"[project]/rb-marketplace/.next-internal/server/app/marketplace/page/actions.js { ACTIONS_MODULE0 => \"[project]/rb-marketplace/app/actions/listings.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "40105282f300ef5022879b2c5d5a4bb918dc10c113",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$app$2f$actions$2f$listings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAvailableGames"],
    "40fc12b29cad7f3b83501f2698d876b613877bb426",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$app$2f$actions$2f$listings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getListings"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f2e$next$2d$internal$2f$server$2f$app$2f$marketplace$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$rb$2d$marketplace$2f$app$2f$actions$2f$listings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/rb-marketplace/.next-internal/server/app/marketplace/page/actions.js { ACTIONS_MODULE0 => "[project]/rb-marketplace/app/actions/listings.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$app$2f$actions$2f$listings$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/app/actions/listings.ts [app-rsc] (ecmascript)");
}),
"[project]/rb-marketplace/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/* eslint-disable import/no-extraneous-dependencies */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "registerServerReference", {
    enumerable: true,
    get: function() {
        return _server.registerServerReference;
    }
});
const _server = __turbopack_context__.r("[project]/rb-marketplace/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)"); //# sourceMappingURL=server-reference.js.map
}),
"[project]/rb-marketplace/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This function ensures that all the exported values are valid server actions,
// during the runtime. By definition all actions are required to be async
// functions, but here we can only check that they are functions.
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ensureServerEntryExports", {
    enumerable: true,
    get: function() {
        return ensureServerEntryExports;
    }
});
function ensureServerEntryExports(actions) {
    for(let i = 0; i < actions.length; i++){
        const action = actions[i];
        if (typeof action !== 'function') {
            throw Object.defineProperty(new Error(`A "use server" file can only export async functions, found ${typeof action}.\nRead more: https://nextjs.org/docs/messages/invalid-use-server-value`), "__NEXT_ERROR_CODE", {
                value: "E352",
                enumerable: false,
                configurable: true
            });
        }
    }
} //# sourceMappingURL=action-validate.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__65d54f0a._.js.map