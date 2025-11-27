(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/rb-marketplace/lib/auth-context.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const DUMMY_ACCOUNTS = {
    user: {
        id: "user-1",
        username: "TrustedTrader",
        email: "user@test.com",
        password: "password123",
        role: "user",
        profilePicture: "/diverse-user-avatars.png",
        banner: "/profile-banner.png",
        bio: "Active Roblox trader with 2+ years experience. Specializing in limited items and currency. Fast and safe trades!",
        joinDate: "2022-03-15",
        vouches: {
            total: 156,
            buyer: 89,
            seller: 67
        },
        badges: [
            "Verified Seller",
            "Pro"
        ],
        robloxProfile: "TrustedTrader_123",
        discordTag: "TrustedTrader#1234"
    },
    admin: {
        id: "admin-1",
        username: "AdminModerator",
        email: "admin@test.com",
        password: "admin123",
        role: "admin",
        profilePicture: "/admin-avatar.png",
        banner: "/admin-banner.jpg",
        bio: "RobloxTrade Admin & Moderator. Here to ensure safe and fair trading for all users.",
        joinDate: "2021-01-01",
        vouches: {
            total: 500,
            buyer: 250,
            seller: 250
        },
        badges: [
            "Verified Seller",
            "Elite",
            "Admin"
        ],
        robloxProfile: "AdminMod_RobloxTrade"
    }
};
function AuthProvider({ children }) {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const login = async (email, password)=>{
        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve)=>setTimeout(resolve, 500));
        let foundUser = null;
        if (email === DUMMY_ACCOUNTS.user.email && password === DUMMY_ACCOUNTS.user.password) {
            foundUser = DUMMY_ACCOUNTS.user;
        } else if (email === DUMMY_ACCOUNTS.admin.email && password === DUMMY_ACCOUNTS.admin.password) {
            foundUser = DUMMY_ACCOUNTS.admin;
        }
        if (foundUser) {
            const { password: _, ...userWithoutPassword } = foundUser;
            setUser(userWithoutPassword);
        } else {
            throw new Error("Invalid email or password");
        }
        setIsLoading(false);
    };
    const logout = ()=>{
        setUser(null);
    };
    const signup = async (email, password, username)=>{
        setIsLoading(true);
        await new Promise((resolve)=>setTimeout(resolve, 500));
        const newUser = {
            id: `user-${Date.now()}`,
            username,
            email,
            role: "user",
            profilePicture: "/abstract-user-avatar.png",
            banner: "/profile-banner.png",
            bio: "",
            joinDate: new Date().toISOString().split("T")[0],
            vouches: {
                total: 0,
                buyer: 0,
                seller: 0
            },
            badges: []
        };
        setUser(newUser);
        setIsLoading(false);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            isLoading,
            login,
            logout,
            signup
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/rb-marketplace/lib/auth-context.tsx",
        lineNumber: 128,
        columnNumber: 10
    }, this);
}
_s(AuthProvider, "Zl4aE56CGbXdDoToH9D5SNkGHyo=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/rb-marketplace/components/theme-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/rb-marketplace/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
'use client';
;
;
function ThemeProvider({ children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$rb$2d$marketplace$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeProvider"], {
        ...props,
        children: children
    }, void 0, false, {
        fileName: "[project]/rb-marketplace/components/theme-provider.tsx",
        lineNumber: 10,
        columnNumber: 10
    }, this);
}
_c = ThemeProvider;
var _c;
__turbopack_context__.k.register(_c, "ThemeProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=rb-marketplace_c3db1bc3._.js.map