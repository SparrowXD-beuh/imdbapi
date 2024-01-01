const express = require("express");
const {connectToDatabase} = require("./database")
const { search, getInfo, getCast, getEpisodes, getTaglines } = require("./search");

const app = express();
const PORT = process.env.PORT || 3000
connectToDatabase().then(() => {
    app.listen(PORT, async () => {
        console.log("API online");
    });
})

app.get("/title/:name", async (req, res) => {
    console.time();
    try {
        const titleName = req.params.name;
        const result = await search(titleName);
        res.send(result);
    } catch (error) {
        res.status(404).send({
            status: 404,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});

app.get("/id/:id", async (req, res) => {
    console.time();
    try {
        const id = req.params.id;
        const result = await getInfo(id);
        res.send(result);
    } catch (error) {
        res.status(404).send({
            status: req.statusCode,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});

app.get("/cast/:id", async (req, res) => {
    console.time();
    try {
        const id = req.params.id;
        const result = await getCast(id);
        res.send(result);
    } catch (error) {
        res.status(404).send({
            status: req.statusCode,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});

app.get("/episodes/:id", async (req, res) => {
    console.time();
    try {
        const id = req.params.id;
        const season = req.query.season;
        const result = await getEpisodes(id, season);
        res.send(result);
    } catch (error) {
        res.status(404).send({
            status: req.statusCode,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});
