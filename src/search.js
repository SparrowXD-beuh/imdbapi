const axios = require("axios");
const cheerio = require("cheerio");
const headers = require("./config.json")

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

        const results = await Promise.all((imdb_id.slice(0, 15)).map(async (id, index) => {
            return await getInfo(id);
        }));

        return results
    } catch (error) {
        console.error("Error:", error.message);
    }
}

const getInfo = async (imdb_id) => {
    try {
        const response = await axios.get(`https://www.imdb.com/title/${imdb_id}`, 
            {
                headers: headers
            }
        );
        const $ = cheerio.load(response.data);
        const title = $("span.hero__primary-text").text().trim();
        const storyline = await getStoryline(imdb_id);
        const poster = $("img.ipc-image").attr("src").trim().replace(/UX.*\.jpg/, "UX3000.jpg");
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

        return {
            imdb_id,
            title,
            poster,
            storyline,
            genres,
            creator,
            producers,
            seasons,
            episodes,
            rating
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

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
        console.error("Error:", error.message);
    }
};

const getTaglines = async () => {
    try {
        await axios.get(`https://www.imdb.com/title/${imdb_id}/taglines`, {
                headers: headers,
            }).then((res) => {
            const $ = cheerio.load(res.data);
            const taglinesArray = [];
            $("div.ipc-html-content-inner-div").each((index, element) => {
                const tagline = $(element).text().trim();
                taglinesArray.push(tagline);
            });
            return taglinesArray;
        })
    } catch (error) {
        console.error("Error:", error.message);
    }
};

const getEpisodes = async (imdb_id, season) => {
    try {
        const response = await axios.get(`https://www.imdb.com/title/${imdb_id}/episodes/?season=${season}`,
            {
                headers: headers,
            }
        );
        const $ = cheerio.load(response.data);
        const episodesArray = [];
        $("article.episode-item-wrapper").each((index, element) => {
            episodesArray.push({
                episode: $(element).find("div.ipc-title__text").text().trim(),
                overview: $(element).find("div.ipc-html-content-inner-div").text().trim(),
                image: $(element).find("img").attr("src").replace(/UX.*\.jpg/, "UX3000.jpg"),
                date: $(element).find("span").eq(0).text().trim(),
                rating: $(element).find("span").eq(1).text().trim(),
            })
        })

        return {episodes: episodesArray}
    } catch (error) {
        console.error("Error: ", error.message);
    }
};

const getCast = async (imdb_id) => {
    try {
        const response = await axios.get(`https://www.imdb.com/title/${imdb_id}/fullcredits`,
            {
                headers: headers,
            }
        );
        const $ = cheerio.load(response.data);
        const castArray = [];
        $("tr.odd, tr.even").each((index, element) => {
            if ($(element).find("td:eq(1) a").text().trim()) {
                castArray.push({
                    name: $(element).find("td:eq(1) a").text().trim(),
                    profile: $(element).find("td:eq(1) a").attr("href"),
                    character: $(element).find("td.character a:eq(0)").text().trim(),
                    screentime: $(element).find("td.character a:eq(1)").text().trim()
                });
            }
        });

        return {cast: castArray};
    } catch (error) {
        console.error("Error fetching cast data:", error.message);
    }
};


module.exports = { search, getInfo, getCast, getEpisodes, getTaglines };