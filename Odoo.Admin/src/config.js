module.exports = {
    api: {
        API_URL:
            process.env.NODE_ENV === "production"
                ? "https://demo.barodaweb.org"
                : "http://localhost:7002",
    },
};
