const express = require("express");
const { search, getInfo, getCast, getEpisodes } = require("./search");


const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("API online at ");
})

app.get("/title/:name", async (req, res) => {
    const titleName = req.params.name;
    const result = await search(titleName).catch((error) => {
        res.send({
            status: req.statusCode,
            error: "Error occured :( \n\n" + error
        })
    });
    res.send(result);
})

app.get("/id/:id", async (req, res) => {
    const foo = performance.now()
    const id = req.params.id;
    const result = await getInfo(id).catch((error) => {
        res.send({
            status: req.statusCode,
            error: "Error occured :( \n\n" + error
        })
    });
    res.send(result);
})

app.get("/cast/:id", async (req, res) => {
    const id = req.params.id;
    const result = await getCast(id).catch((error) => {
        res.send({
            status: req.statusCode,
            error: "Error occured :( \n\n" + error
        })
    });
    res.send(result);
})

app.get("/episodes/:id", async (req, res) => {
    const id = req.params.id;
    const season = req.query.season;
    const result = await getEpisodes(id, season).catch((error) => {
        res.send({
            status: req.statusCode,
            error: "Error occured :( \n\n" + error
        })
    });
    res.send(result);
})

app.get("/taglines/:id", async (req, res) => {
    const id = req.params.id;
    const result = await getTaglines(id).catch((error) => {
        res.send({
            status: req.statusCode,
            error: "Error occured :( \n\n" + error
        })
    });
    res.send(result);
})
