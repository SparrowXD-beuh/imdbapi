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

        const results = await Promise.all((imdb_id.slice(0, 5)).map(async (id, index) => {
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
        if (exists) return exists.data;
        const response = await axios.get(`https://www.imdb.com/title/${imdb_id}`, { headers: headers });
        const $ = cheerio.load(response.data);
        const title = $("span.hero__primary-text").text().trim();
        const poster = $("img.ipc-image").attr("src").trim().replace(/UX.*\.jpg/, "UX3000.jpg");
        const genres = $("div.ipc-chip-list__scroller").find("a").map((index, element) => {
            return ($(element).text().trim());
        }).get();
        const producers = $("a:contains('Production companies')").next("div").find("a").map((index, element) => {
            return ($(element).text().trim());
        }).get();
        const rating = $("div[data-testid='hero-rating-bar__aggregate-rating__score']").eq(0).find("span").text().trim();
        const creator = $("a.ipc-metadata-list-item__list-content-item").eq(0).text().trim();
        const seasons = $("select#browse-episodes-season").find("option").length - 2;
        const episodes = parseInt($("span.ipc-title__subtext").eq(0).text().trim());
        const textArray = $("div.ipc-html-content-inner-div").map((index, element) => {
            return ($(element).text().trim());
        }).get();
        const doc = {
            _id: imdb_id,
            data: {
                imdb_id,
                title,
                type: seasons <= 0 ? "Movie" : "TV show",
                poster,
                storyline: textArray,
                // taglines: await getTaglines(imdb_id),
                genres,
                creator,
                producers,
                seasons: seasons <= 0 ? null : seasons,
                episodes: seasons <= 0 ? null : episodes,
                rating,
            }
        };
        await insert(doc, "titles");
        return doc.data;
    } catch (error) {
        console.error("Error:", error);
        throw new Error("Invalid imdb_id");
    }
};

const getTaglines = async (imdb_id) => {
    try {
        const exists = await find(imdb_id, "taglines");
        if (exists) return exists;
        const result = await axios.get(`https://www.imdb.com/title/${imdb_id}/taglines`, {
            headers: headers,
        })
        const $ = cheerio.load(result.data);
        const taglinesArray = [];
        $("div.ipc-html-content-inner-div").each((index, element) => {
            taglinesArray.push($(element).text().trim());
        });
        if (textArray.length <= 0) throw new Error("Invalid imdb_id")
        await insert({_id: imdb_id, taglines: taglinesArray}, "taglines");
        return {_id: imdb_id, taglines: taglinesArray};
    } catch (error) {
        console.error("Error in getTaglines():", error.message);
        throw error;
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

const getDocs = async () => {
    return (`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="./public/favicon.ico" type="image/x-icon">
        <link rel="shortcut icon" href="./public/favicon.ico" type="image/x-icon">
        <title>Docs</title>
        <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f7f7f7;
        }

        h1,
        h2 {
            color: #333;
        }

        pre {
            background-color: #ffffff;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin-bottom: 20px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        code {
            font-family: Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace;
            font-size: 16px;
            color: #333;
            font-weight: bold;
        }

        hr {
            margin-top: 20px;
            margin-bottom: 20px;
            border: 0;
            border-top: 1px solid #eee;
        }

        a {
            color: #4285f4;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        a:hover {
            color: #1a73e8;
        }
        </style>
    </head>
    <body>
        <h1 style="color: #4285f4">IMDb API Documentation</h1>

        <h2 style="color: #34a853">Search by Title</h2>
        <pre>
            <code>
    <a href="#">GET /title/:name</a>
    
    Example: <a href="#">/title/The%20Walking%20Dead</a>
    Response:
    {
        "status": 200,
        "result": [
        {
            "_id": "tt1520211",
            "title": "The Walking Dead",
            "type": "TV show",
            "poster": "<a target="_blank" href="https://m.media-amazon.com/images/M/MV5BNzI5MjUyYTEtMTljZC00NGI5LWFhNWYtYjY0ZTQ5YmEzMWRjXkEyXkFqcGdeQXVyMTY3MDE5MDY1._V1_QL75_UX3000.jpg">https://m.media-amazon.com/images/M/MV5BNzI5MjUyYTEtMTljZC00NGI5LWFhNWYtYjY0ZTQ5YmEzMWRjXkEyXkFqcGdeQXVyMTY3MDE5MDY1._V1_QL75_UX3000.jpg</a>",
            "genres": [
            "Drama",
            "Horror",
            "Thriller"
            ],
            "creator": "Frank Darabont",
            "producers": [
            "American Movie Classics (AMC)",
            "Circle of Confusion",
            "Valhalla Motion Pictures"
            ],
            "seasons": 11,
            "episodes": 177,
            "rating": "8.1/10",
            "expiresAt": "2024-01-09T09:05:14.687Z"
        },
        {
            "_id": "tt3743822",
            "title": "Fear the Walking Dead",
            "type": "TV show",
            "poster": "<a target="_blank" href="https://m.media-amazon.com/images/M/MV5BZWQ2NGZhMTktMzJjZi00ZTNjLTljZjMtMzU0ODU1OWNhOTY1XkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_QL75_UX3000.jpg">https://m.media-amazon.com/images/M/MV5BZWQ2NGZhMTktMzJjZi00ZTNjLTljZjMtMzU0ODU1OWNhOTY1XkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_QL75_UX3000.jpg</a>",
            "genres": [
            "Drama",
            "Horror",
            "Sci-Fi"
            ],
            "creator": "Dave Erickson",
            "producers": [
            "American Movie Classics (AMC)",
            "Circle of Confusion",
            "Skybound Entertainment"
            ],
            "seasons": 8,
            "episodes": 113,
            "rating": "6.8/10",
            "expiresAt": "2024-01-09T09:05:17.080Z"
        },
        {
            "_id": "tt13062500",
            "title": "The Walking Dead: Daryl Dixon",
            "type": "TV show",
            "poster": "<a target="_blank" href="https://m.media-amazon.com/images/M/MV5BYmU2MGMyNzQtMmQ1Mi00ZjQ0LThhNDYtN2I3N2M4NTgyMDc3XkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_QL75_UX3000.jpg">https://m.media-amazon.com/images/M/MV5BYmU2MGMyNzQtMmQ1Mi00ZjQ0LThhNDYtN2I3N2M4NTgyMDc3XkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_QL75_UX3000.jpg</a>",
            "genres": [
            "Drama",
            "Horror",
            "Sci-Fi"
            ],
            "creator": "David Zabel",
            "producers": [],
            "seasons": 2,
            "episodes": 12,
            "rating": "7.7/10",
            "expiresAt": "2024-01-09T09:05:16.941Z"
        },
        loadmore - 3
    }
            </code>
        </pre>

        <hr />

        <h2 style="color: #fbbc05">Get Information by ID</h2>
        <pre>
            <code>
    <a href="#">GET /id/:id</a>
                
    Example: <a href="#">/id/tt1520211</a>
    Response:
    {
        "status": 200,
        "result": {
            "_id": "tt1520211",
            "title": "The Walking Dead",
            "type": "TV show",
            "poster": "<a target="_blank" href="https://m.media-amazon.com/images/M/MV5BNzI5MjUyYTEtMTljZC00NGI5LWFhNWYtYjY0ZTQ5YmEzMWRjXkEyXkFqcGdeQXVyMTY3MDE5MDY1._V1_QL75_UX3000.jpg">https://m.media-amazon.com/images/M/MV5BNzI5MjUyYTEtMTljZC00NGI5LWFhNWYtYjY0ZTQ5YmEzMWRjXkEyXkFqcGdeQXVyMTY3MDE5MDY1._V1_QL75_UX3000.jpg</a>",
            "genres": [
            "Drama",
            "Horror",
            "Thriller"
            ],
            "creator": "Frank Darabont",
            "producers": [
            "American Movie Classics (AMC)",
            "Circle of Confusion",
            "Valhalla Motion Pictures"
            ],
            "seasons": 11,
            "episodes": 177,
            "rating": "8.1/10",
            "expiresAt": "2024-01-09T09:05:14.687Z"
        }
    }
            </code>
        </pre>

        <hr />

        <h2 style="color: #ea4335">Get Cast by ID</h2>
        <pre>
            <code>
    <a href="#">GET /cast/:id</a>
    
    Example: <a href="#">/cast/tt1520211</a>
    Response:
    {
        "status": 200,
        "result": {
        "_id": "tt1520211",
        "cast": [
            {
            "name": "Norman Reedus",
            "profile": "/name/nm0005342/?ref_=ttfc_fc_cl_t1",
            "character": "Daryl Dixon",
            "screentime": "175 episodes, 2010-2022"
            },
            {
            "name": "Melissa McBride",
            "profile": "/name/nm0564350/?ref_=ttfc_fc_cl_t2",
            "character": "Carol Peletier",
            "screentime": "174 episodes, 2010-2022"
            },
            {
            "name": "Lauren Cohan",
            "profile": "/name/nm1659348/?ref_=ttfc_fc_cl_t3",
            "character": "Maggie Rhee",
            "screentime": "144 episodes, 2011-2022"
            },
            {
            "name": "Christian Serratos",
            "profile": "/name/nm1589312/?ref_=ttfc_fc_cl_t4",
            "character": "Rosita Espinosa",
            "screentime": "130 episodes, 2014-2022"
            },
            {
            "name": "Josh McDermitt",
            "profile": "/name/nm3129311/?ref_=ttfc_fc_cl_t5",
            "character": "Eugene Porter",
            "screentime": "130 episodes, 2014-2022"
            }
        loadmore - 985
        }
    }
            </code>
        </pre>

        <hr />

        <h2 style="color: #0f9d58">Get Episodes by ID</h2>
        <pre>
            <code>
    <a href="#">GET /episodes/:id?season=:season</a>
    
    Example: <a href="#">/episodes/tt1520211?season=1</a>
    Response:
    {
        "status": 200,
        "result": {
        "_id": {
            "imdb_id": "tt1520211",
            "season": "1"
        },
        "episodes": [
            {
            "episode": "S1.E1 ∙ Days Gone Bye",
            "overview": "Deputy Sheriff Rick Grimes awakens from a coma, and searches for his family in a world ravaged by the undead.",
            "image": "<a target="_blank" href="https://m.media-amazon.com/images/M/MV5BMTYwMzIwODM3NF5BMl5BanBnXkFtZTcwNjE3MDQwNA@@._V1_QL75_UX3000.jpg">https://m.media-amazon.com/images/M/MV5BMTYwMzIwODM3NF5BMl5BanBnXkFtZTcwNjE3MDQwNA@@._V1_QL75_UX3000.jpg</a>",
            "date": "Sun, Oct 31, 2010",
            "rating": "9.2/10 (29K)"
            },
            {
            "episode": "S1.E2 ∙ Guts",
            "overview": "In Atlanta, Rick is rescued by a group of survivors, but they soon find themselves trapped inside a department store surrounded by walkers.",
            "image": "<a target="_blank" href="https://m.media-amazon.com/images/M/MV5BMTgxNDQzNjQ2NV5BMl5BanBnXkFtZTcwODg2MDQwNA@@._V1_QL75_UX3000.jpg">https://m.media-amazon.com/images/M/MV5BMTgxNDQzNjQ2NV5BMl5BanBnXkFtZTcwODg2MDQwNA@@._V1_QL75_UX3000.jpg</a>",
            "date": "Sun, Nov 7, 2010",
            "rating": "8.6/10 (18K)"
            },
        loadmore - 5
        }
    }
            </code>
        </pre>

        <hr />
    </body>
    </html>
    `);
}


module.exports = { search, getInfo, getCast, getEpisodes, getTaglines, getDocs };