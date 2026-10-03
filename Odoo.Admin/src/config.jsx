export default {
    api: {
        API_URL:
            import.meta.env.MODE === "production"
                ? import.meta.env.VITE_API_URL || "https://api.arambhsportsarena.com"
                : import.meta.env.VITE_API_URL || "http://localhost:7003",
    },
};
