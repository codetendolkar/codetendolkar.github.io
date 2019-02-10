function generateHypersphere(dim, num_points){
    var radius = 4;
    var points = new Array(num_points);
    for (var p=0; p<num_points; p++){
        var point = new Array(dim);
        for (var d=0; d<dim; d++){
            point[d] = Math.random()-0.5;
        }
        var squaredCoords = point.map(function(coord){
            return coord*coord;
        });
        var norm = Math.sqrt(squaredCoords.reduce(function(a,b){
                return a+b;
            })
        );
        for (var d=0; d<dim; d++){
            point[d] = point[d]*radius/norm;
        }
        points[p] = point;
    }
    return points;
}

function pastelColors(){
    var r = (Math.round(Math.random()* 127) + 127).toString(16);
    r = r.length===1 ? "0"+r : r;
    var g = (Math.round(Math.random()* 127) + 127).toString(16);
    g = g.length===1 ? "0"+g : g;
    var b = (Math.round(Math.random()* 127) + 127).toString(16);
    b = b.length===1 ? "0"+b : b;
    return "0x" + r + g + b;
}

function drawPMatrix(P, idx) {
    N = Math.floor(Math.sqrt(P.length));
    var min = Math.min.apply(Math, P);
    var max = Math.max.apply(Math, P);
    if (max-min===0) {
        max = 1;
        min = 0;
    }
    var canvas = document.getElementById(idx);
    var ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
            ctx.fillStyle = 'rgb(' + Math.floor(255*(P[i*N+j]-min)/(max-min)) + ', 66, 99)';
            ctx.fillRect(j * canvas.width/N, i * canvas.width/N, canvas.width/N, canvas.width/N);
            ctx.fill();
        }
    }
}

function autorun(Y, preplexity, num_iterations) {

    //Aliases
    var Application = PIXI.Application,
        Container = PIXI.Container,
        Graphics = PIXI.Graphics;

    //Create a Pixi Application
    var app = new Application({
            antialias: true,
            transparent: true,
            resolution: 1,
            height: 500
        }
    );

    var canvasHeight = app.screen.height;
    var canvasWidth = app.screen.width;
    var embeddingSize = 5;

    //Add the canvas that Pixi automatically created for you to the HTML document
    var canvasContainer = document.getElementById("animationContainer");
    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(app.view);

    //var Y = [[1.0, 0.1, 0.2], [0.1, 1.0, 0.3], [0.2, 0.1, 1.0]];
    var stepCount = 1;

    // Initialize points
    var embeddings;

    var initializeEmbeddings = function (Y) {
        numPoints = Y.length;
        embeddings = new Container();
        embeddings.position.set(canvasWidth/2,canvasHeight/2);
        for(var i = 0; i < numPoints; i++) {
            var circle = new Graphics();
            //var hue = Math.random()*0xFFFFFF<<0;
            var hue = pastelColors();
            circle.beginFill(hue);
            circle.lineStyle(1, 0xFF00FF, 1);
            circle.drawCircle(0, 0, embeddingSize);
            circle.endFill();
            embeddings.addChild(circle)
        }
        app.stage.addChild(embeddings);
    };

    var opt = {};
    opt.epsilon = 10; // epsilon is learning rate (10 = default)
    opt.perplexity = preplexity; // roughly how many neighbors each point influences (30 = default)
    opt.dim = 2; // dimensionality of the embedding (2 = default)

    var tsne = new tsnejs.tSNE(opt); // create a tSNE instance

    tsne.initDataRaw(Y);
    setup();

    var initialSolution = tsne.getSolution();
    initializeEmbeddings(initialSolution["Y"]);
    drawPMatrix(initialSolution["P"], "PMatrixCanvas");

    var renderEmbeddings = function (Y) {
        numPoints = Y.length;
        for(var i = 0; i < numPoints; i++) {
            embeddings.children[i].x = Y[i][0]*15;
            embeddings.children[i].y = Y[i][1]*15;
        }
    };

    function setup() {
        //set the game state to `play`
        state = play;

        //Start the game loop
        app.ticker.add(delta => gameLoop(delta));
    }

    function gameLoop(delta) {
        //Update the current game state:
        state(delta);
    }

    function play(delta) {
        //All the game logic goes here
        var Q = tsne.step(); // every time you call this, solution gets better
        var solution = tsne.getSolution();
        Y = solution["Y"];
        drawPMatrix(Q, "QMatrixCanvas");
        renderEmbeddings(Y);
        stepCount = stepCount+1;
        if (stepCount>num_iterations){
            state = end;
        }
    }

    function end() {
        //All the code that should run at the end of the game
        console.log("done");
        stepCount = 1;
        app.stop();
        app.destroy();
    }
}
window.addEventListener("load",function() {
    var customDataSource = true;
    document.getElementById('controlForm').addEventListener("submit",function(e) {
        e.preventDefault(); // before the code

        var dim = document.getElementById("dimension").value;
        var perp = document.getElementById("perplexity").value;
        var np = document.getElementById("numPoints").value;
        var numIts = document.getElementById("numIts").value;

        var Y;
        if (customDataSource){
            Y = JSON.parse(document.getElementById("points").value);
        } else {
            Y = generateHypersphere(dim, np);
        }

        //var Y = generateHypersphere(dim, np);

        var numPoints = Y.length;

        var canvas = document.getElementById("dataCanvas");
        var scale = Math.min(canvas.width, canvas.height)/10;
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgb(0,66,99)";
        for(var i = 0; i < numPoints; i++) {
            ctx.fillRect(Y[i][0]*scale+canvas.width/2, Y[i][1]*scale+canvas.height/2, 3, 3);
        }
        autorun(Y, perp, numIts);
    });

    $('[data-toggle="tooltip"]').tooltip();
    $('#enterCustomData').click(function () {
        customDataSource = true;
        $('.customData').show();
        $('.exampleData').hide();
        $(this).hide();
        $('#cancelButton').show();
    });
    $('#cancelButton').click(function () {
        customDataSource = false;
        $('.customData').hide();
        $('.exampleData').show();
        $(this).hide();
        $('#enterCustomData').show();
    });
    document.getElementById("run").click();
});