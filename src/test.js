const { connectToDatabase, search, getInfo, getCast, getEpisodes, getTaglines } = require("./search");

(async () => {
    console.log(await getTaglines("tt1520211"));
})();