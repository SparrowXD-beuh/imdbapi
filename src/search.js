const axios = require("axios");
const cheerio = require("cheerio");
const headers = require("./config.json");
const { insert, find } = require("./database");

const search = async (titleName) => {
    try {
        const response = await axios.get(`https://www.imdb.com/search/title/?title=${titleName}`, {
            headers: headers,
        });
        const $ = cheerio.load(response.data);

        const imdb_id = [];
        $("a.ipc-title-link-wrapper").each((index, element) => {
            imdb_id.push($(element).attr("href").match(/\/title\/(tt\d+)\/\?/)[1]);
        });

        if (imdb_id.length <= 0) {
            throw new Error("No results found for search with title " + titleName)
        }

        const results = await Promise.all((imdb_id.slice(0, 1)).map(async (id, index) => {
            return await getInfo(id);
        }));

        return results
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    }
}

const getInfo = async (imdb_id) => {
    try {
        const exists = await find(imdb_id, "titles");
        if (exists) return exists;
        const response = await axios.get(`https://www.imdb.com/title/${imdb_id}`, 
            {
                headers: headers
            }
        );
        const $ = cheerio.load(response.data);
        const title = $("span.hero__primary-text").text().trim();
        const poster = $("img.ipc-image").attr("src").trim().replace(/@@.*$/, "@@._V1_QL75_UX3000.jpg");        ;
        const genres = [];
        $("div.ipc-chip-list__scroller").find("a").each((index, element) => {
            genres.push($(element).text().trim())
        })
        const producers = [];
        $("a:contains('Production companies')").next("div").find("a").each((index, element) => {
            producers.push($(element).text().trim())
        })
        const rating = $("div[data-testid='hero-rating-bar__aggregate-rating__score']").eq(0).find("span").text().trim();
        const creator = $("a.ipc-metadata-list-item__list-content-item").eq(0).text().trim();
        const seasons = $("select#browse-episodes-season").find("option").length - 2;
        const episodes = parseInt($("span.ipc-title__subtext").eq(0).text().trim());

        const doc = {
            _id: imdb_id,
            title,
            type: seasons <= 0 ? "Movie" : "TV series",
            poster,
            storyline: await getStoryline(imdb_id),
            taglines: await getTaglines(imdb_id),
            genres,
            creator,
            producers,
            seasons: seasons <= 0 ? null : seasons,
            episodes: seasons <= 0 ? null : episodes,
            rating,
        };
        await insert(doc, "titles");
        return doc;
    } catch (error) {
        console.error("Error:", error);
        throw new Error("Invalid imdb_id");
    }
};

const getStoryline = async (imdb_id) => {
    try {
        const result = await axios.get(`https://www.imdb.com/title/${imdb_id}/plotsummary`, {
            headers: headers,
        })
        const $ = cheerio.load(result.data);
        const textArray = [];
        $("div.ipc-html-content-inner-div").each((index, element) => {
            const text = $(element).text().trim();
            textArray.push(text);
        });
        return textArray
    } catch (error) {
        console.error("Error in getStoryline():", error.message);
    }
};

const getTaglines = async (imdb_id) => {
    try {
        const result = await axios.get(`https://www.imdb.com/title/${imdb_id}/taglines`, {
            headers: headers,
        })
        const $ = cheerio.load(result.data);
        const taglinesArray = [];
        $("div.ipc-html-content-inner-div").each((index, element) => {
            taglinesArray.push($(element).text().trim());
        });
        return taglinesArray;
    } catch (error) {
        console.error("Error in getTaglines():", error.message);
    }
};

const getEpisodes = async (imdb_id, season) => {
    try {
        const exists = await find({imdb_id, season}, "episodes");
        if (exists) return exists;
        if (season <= 0) throw new Error("Season cant be 0 or a negative Int");
        const response = await axios.get(`https://www.imdb.com/title/${imdb_id}/episodes/?season=${season}`,
            {
                headers: headers,
            }
        );
        const $ = cheerio.load(response.data);
        const episodesArray = [];
        await Promise.all($("article.episode-item-wrapper").each((index, element) => {
            episodesArray.push({
                episode: $(element).find("div.ipc-title__text").text().trim(),
                overview: $(element).find("div.ipc-html-content-inner-div").text().trim(),
                image: $(element).find("img").attr("src").replace(/UX.*\.jpg/, "UX3000.jpg"),
                date: $(element).find("span").eq(0).text().trim(),
                rating: $(element).find("span").eq(1).text().trim(),
            })
        }))
        if (episodesArray.length <= 0) throw new Error("No episodes found for season " + season)
        const doc = {
            _id: {imdb_id, season},
            episodes: episodesArray
        };
        await insert(doc, "episodes");
        return doc;
    } catch (error) {
        console.error("Error: ", error.message);
        throw error;
    }
};

const getCast = async (imdb_id) => {
    try {
        const exists = await find(imdb_id, "cast");
        if (exists) return exists;
        const response = await axios.get(`https://www.imdb.com/title/${imdb_id}/fullcredits`,
            {
                headers: headers,
            }
        );
        const $ = cheerio.load(response.data);
        const castArray = [];
        await Promise.all($("tr.odd, tr.even").each((index, element) => {
            if ($(element).find("td:eq(1) a").text().trim()) {
                castArray.push({
                    name: $(element).find("td:eq(1) a").text().trim(),
                    profile: $(element).find("td:eq(1) a").attr("href"),
                    character: $(element).find("td.character a:eq(0)").text().trim(),
                    screentime: $(element).find("td.character a:eq(1)").text().trim()
                });
            }
        }));
        if (castArray.length <= 0) throw new Error("Coudnt find any cast for imdb_id " + imdb_id)
        const doc = {_id: imdb_id, cast: castArray};
        await insert(doc, "cast");
        return doc;
    } catch (error) {
        console.error("Error fetching cast data:", error.message);
        throw error
    }
};


module.exports = { search, getInfo, getCast, getEpisodes, getTaglines };
