const express = require("express");
const path = require("path");
const cors = require("cors")
const {connectToDatabase} = require("./database")
const { search, getInfo, getCast, getEpisodes, getTaglines, getDocs } = require("./search");

const app = express();
connectToDatabase().then(() => {
    app.listen(process.env.PORT || 3000, async () => {
        console.log("API online");
    });
})

app.use(cors());
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.get("/", async (req, res) => {
    console.time();
    try {
        res.send(await getDocs());
    } catch (error) {
        res.status(404).send({
            status: res.statusCode,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});

app.get("/title/:name", async (req, res) => {
    console.time();
    try {
        const result = await search(req.params.name);
        res.send({status: res.statusCode, result});
    } catch (error) {
        res.status(404).send({
            status: res.statusCode,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});

app.get("/id/:id", async (req, res) => {
    console.time();
    try {
        const result = await getInfo(req.params.id);
        res.send({status: res.statusCode, result});
    } catch (error) {
        res.status(404).send({
            status: res.statusCode,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});

app.get("/cast/:id", async (req, res) => {
    console.time();
    try {
        const result = await getCast(req.params.id);
        res.send({status: res.statusCode, result});
    } catch (error) {
        res.status(404).send({
            status: res.statusCode,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});

app.get("/episodes/:id", async (req, res) => {
    console.time();
    try {
        const result = await getEpisodes(req.params.id, req.query.season);
        res.send({status: res.statusCode, result});
    } catch (error) {
        res.status(404).send({
            status: res.statusCode,
            error: "Error occurred :(   " + error
        });
    } finally {
        console.timeEnd();
    }
});