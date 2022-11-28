// Config:                               //////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var rowSize = 50; // Adjust the map size with rowSize
var visSize = rowSize * rowSize; // Map size = rowSize^2
var visitAnimationSpeed = 1;
var pathAnimationSpeed = 20;
var autoResetSpeed = 1000;
var heuristicWeight = 1; // Set the weight for A*'s heuristic component
var heuristicIsExponent = true;
var showNodeNumber = false;
// Visualizer Components and Properties: /////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var nodeState;
(function (nodeState) {
    nodeState[nodeState["Unvisited"] = 0] = "Unvisited";
    nodeState[nodeState["Visited1"] = 1] = "Visited1";
    nodeState[nodeState["Visited2"] = 2] = "Visited2";
    nodeState[nodeState["Obstacle"] = 3] = "Obstacle";
    nodeState[nodeState["Start"] = 4] = "Start";
    nodeState[nodeState["End"] = 5] = "End";
    nodeState[nodeState["Path1"] = 6] = "Path1";
    nodeState[nodeState["Path2"] = 7] = "Path2";
    nodeState[nodeState["Unsolvable"] = 8] = "Unsolvable";
})(nodeState || (nodeState = {}));
var visMode;
(function (visMode) {
    visMode[visMode["Dijkstra"] = 0] = "Dijkstra";
    visMode[visMode["AStar"] = 1] = "AStar";
})(visMode || (visMode = {}));
var visNode = /** @class */ (function () {
    function visNode(visNodeID) {
        this.state = nodeState.Unvisited;
        this.div = document.createElement('div');
        this.previousNode = null;
        this.nodeID = null;
        this.nodeID = visNodeID; //      Assign a nodeID to the class
        this.div.setAttribute('visNodeID', visNodeID); //      Assign an ID to the div
        this.div.className = "vis-node"; //      Assign the vis-node class to the div
        if (showNodeNumber)
            this.div.innerHTML = visNodeID;
        var visContainer = document.getElementById('vis-container');
        if (visContainer) //      Make sure the container exists for the div
            visContainer.appendChild(this.div); //      Place the div in the container
        else
            console.log("Error::visualizer.ts: visNode cannot be constructed without a visContainer");
        // Make each visNode interactive
        this.div.addEventListener("click", function (ev) {
            var element = ev.target; // Use the visNodeID attribute to target nodes
            var targetNode = parseInt(element.getAttribute('visNodeID'));
            visualizer.toggle(targetNode);
        });
    }
    visNode.prototype.getState = function () { return this.state; };
    visNode.prototype.setState = function (newState) {
        this.state = newState;
        if (newState === nodeState.Unvisited)
            this.div.style.backgroundColor = 'var(--unvisited)';
        else if (newState === nodeState.Visited1)
            this.div.style.backgroundColor = 'var(--visited1)';
        else if (newState === nodeState.Visited2)
            this.div.style.backgroundColor = 'var(--visited2)';
        else if (newState === nodeState.Obstacle)
            this.div.style.backgroundColor = 'var(--obstacle)';
        else if (newState === nodeState.Start)
            this.div.style.backgroundColor = 'var(--start)';
        else if (newState === nodeState.End)
            this.div.style.backgroundColor = 'var(--end)';
        else if (newState === nodeState.Path1)
            this.div.style.backgroundColor = 'var(--path1)';
        else if (newState === nodeState.Path2)
            this.div.style.backgroundColor = 'var(--path2)';
        else if (newState === nodeState.Unsolvable)
            this.div.style.backgroundColor = 'var(--unsolvable)';
    };
    visNode.prototype.getNodeNumber = function () { return this.nodeID; };
    return visNode;
}());
var Visualizer = /** @class */ (function () {
    function Visualizer() {
        this.map = new Array(); // Create our map
        this.div = document.createElement('div'); // Create a container for our visualizer
        this.startNode = -1; // Keep track of our start and end nodes
        this.endNode = -1;
        this.mode = visMode.Dijkstra; // Run mode (Dijkstra's, Auto, etc)
        this.isRunning = false; // Run switch
        this.isDrawing = false;
        this.autoOn = false;
        this.comparisonOn = false;
        this.halted = false;
        this.inputMode = nodeState.Obstacle; // When a user clicks, what are they trying to place?
        this.current = 0;
        this.autoTimeout = 1;
        this.totalPathDiff = 0;
        this.totalVisitDiff = 0;
        this.updateCount = 0;
        this.dDraw = new Array();
        this.dUndraw = new Array();
        this.aDraw = new Array();
        this.aUndraw = new Array();
        document.body.appendChild(this.div);
        this.div.className = 'map-container';
        this.div.setAttribute('id', 'vis-container');
        for (var i = 0; i < visSize; i++) { // Use the constructor to create visSize
            var newNode = new visNode(i); // many visNodes and push them to our map
            this.map.push(newNode);
        }
    }
    Visualizer.prototype.setNode = function (targetNode, value) {
        if (value === nodeState.Start) { // Only allow one start node
            if (this.startNode !== -1) {
                this.map[this.startNode].setState(nodeState.Unvisited);
            }
            this.startNode = targetNode;
        }
        else if (value === nodeState.End) { // Only allow one end node
            if (this.endNode !== -1)
                this.map[this.endNode].setState(nodeState.Unvisited);
            this.endNode = targetNode;
        }
        else if (value === nodeState.Obstacle) {
            if (targetNode === this.startNode) // Dont allow Obstacle to overwrite Start/End
                value = nodeState.Start;
            else if (targetNode === this.endNode)
                value = nodeState.End;
            else if (this.map[targetNode].getState() === value) // Toggle between Obstacle and Unvisited
                value = nodeState.Unvisited;
        }
        this.map[targetNode].setState(value); // Set this node after duplicate checks
    };
    Visualizer.prototype.getNode = function (targetNode) { return this.map[targetNode].getState(); };
    Visualizer.prototype.generateTest = function () {
        this.reset();
        var start = Math.floor(Math.random() * visSize);
        var end = Math.floor(Math.random() * visSize);
        while (start === end)
            end = Math.floor(Math.random() * visSize);
        for (var i = 0; i < visSize / 2.5; i++)
            this.setNode(Math.floor(Math.random() * visSize), nodeState.Obstacle);
        this.setNode(start, nodeState.Start);
        this.setNode(end, nodeState.End);
    };
    Visualizer.prototype.generateMaze = function () {
        var x = 0;
        var y = 0;
        for (y = 0; y < rowSize; y++) {
            for (x = 0; x < rowSize; x++) {
                if ((x % 4 == 0 || y % 4 == 0)) {
                    var target_1 = this.map[y * rowSize + x];
                    target_1.setState(nodeState.Obstacle);
                }
            }
        }
        var target = 0;
        var state = nodeState.Obstacle;
        do {
            target = Math.floor(Math.random() * visSize);
            state = this.map[target].getState();
        } while (state == nodeState.Obstacle);
        this.map[target].setState(nodeState.Start);
        do {
            target = Math.floor(Math.random() * visSize);
            state = this.map[target].getState();
        } while (state == nodeState.Obstacle || state == nodeState.Start);
        this.map[target].setState(nodeState.End);
    };
    Visualizer.prototype.reset = function () {
        for (var _i = 0, _a = this.map; _i < _a.length; _i++) {
            var node = _a[_i];
            node.setState(nodeState.Unvisited);
        }
    };
    Visualizer.prototype.clear = function () {
        for (var _i = 0, _a = this.map; _i < _a.length; _i++) {
            var node = _a[_i];
            var state = node.getState();
            if (state !== nodeState.Start &&
                state !== nodeState.End &&
                state !== nodeState.Obstacle)
                node.setState(nodeState.Unvisited);
        }
    };
    Visualizer.prototype.place = function (newInputMode) {
        this.inputMode = newInputMode;
    };
    Visualizer.prototype.toggle = function (targetNode) {
        if (this.isRunning)
            return; // Don't toggle nodes while an algorithm is running
        else if (this.inputMode === nodeState.Obstacle)
            this.setNode(targetNode, nodeState.Obstacle);
        else if (this.inputMode === nodeState.Start) {
            this.setNode(targetNode, nodeState.Start);
            this.inputMode = nodeState.End;
        }
        else if (this.inputMode === nodeState.End) {
            this.setNode(targetNode, nodeState.End);
            this.inputMode = nodeState.Obstacle;
        }
    };
    Visualizer.prototype.setMode = function (newMode) {
        this.mode = newMode;
    };
    Visualizer.prototype.stop = function () {
        this.isRunning = false;
        this.halted = true;
    };
    Visualizer.prototype.auto = function () {
        var _this = this;
        if (this.halted)
            return;
        if (!this.isRunning && !this.isDrawing) {
            this.isRunning = true;
            visualizer.reset(); // Create a fresh maze
            visualizer.generateTest();
            setTimeout(function () { visualizer.run(); }, 0); // Crashes without the timeout for some reason
        }
        else
            setTimeout(function () { _this.auto(); }, 500);
    };
    Visualizer.prototype.draw = function () {
        var _this = this;
        this.isDrawing = true;
        var runID = this.updateCount;
        var timing = 0;
        var _loop_1 = function (i) {
            if ((this_1.mode === visMode.AStar && !this_1.autoOn) || this_1.halted)
                return "break";
            var node = this_1.dDraw[i];
            var state = this_1.dDraw[i + 1];
            timing += (state === nodeState.Path1) ? pathAnimationSpeed :
                visitAnimationSpeed;
            setTimeout(function () {
                if (!_this.halted && runID === _this.updateCount)
                    _this.map[node].setState(state);
            }, timing);
        };
        var this_1 = this;
        for (var i = 0; i < this.dDraw.length; i += 2) {
            var state_1 = _loop_1(i);
            if (state_1 === "break")
                break;
        }
        if (this.autoOn) {
            timing += autoResetSpeed;
            setTimeout(function () {
                if (!_this.comparisonOn && !_this.halted && runID === _this.updateCount)
                    _this.clear();
            }, timing);
        }
        var _loop_2 = function (i) {
            if ((this_2.mode === visMode.Dijkstra && !this_2.autoOn) || this_2.halted)
                return "break";
            var node = this_2.aDraw[i];
            var state = this_2.aDraw[i + 1];
            timing += (state === nodeState.Path2) ? pathAnimationSpeed :
                visitAnimationSpeed;
            setTimeout(function () {
                if (!_this.halted && runID === _this.updateCount
                    && !(_this.comparisonOn && _this.map[node].getState() == nodeState.Path1
                        && state == nodeState.Visited2))
                    _this.map[node].setState(state);
            }, timing);
        };
        var this_2 = this;
        for (var i = 0; i < this.aDraw.length; i += 2) {
            var state_2 = _loop_2(i);
            if (state_2 === "break")
                break;
        }
        setTimeout(function () {
            if (runID === _this.updateCount)
                _this.isDrawing = false;
        }, timing + autoResetSpeed);
    };
    Visualizer.prototype.run = function () {
        console.clear();
        this.isRunning = true;
        if (this.halted)
            this.halted = false;
        var run = new PathFind;
        this.result = run;
        run.update(this.map, this.startNode, this.endNode);
        this.updateCount++;
        var pathDiff = this.result.dijkstraPath.length - this.result.aStarPath.length;
        var visitDiff = this.result.dijkstraVisit.length - this.result.aStarVisit.length;
        this.totalPathDiff += pathDiff;
        this.totalVisitDiff += visitDiff;
        var avgPath = this.totalPathDiff / this.updateCount;
        var avgVisit = this.totalVisitDiff / this.updateCount;
        console.log("difference: " + pathDiff + " " + visitDiff);
        console.log("average: " + avgPath + " " + avgVisit);
        this.render();
        if (this.autoOn)
            this.auto();
    };
    Visualizer.prototype.render = function () {
        console.log("rendering result");
        if (!this.result.isDone()) {
            this.renderTimeout(0);
            return;
        }
        var draw = new Array();
        var undraw = new Array();
        for (var _i = 0, _a = this.result.dijkstraVisit; _i < _a.length; _i++) { // Render Visited tiles
            var node = _a[_i];
            draw.push(node);
            draw.push(nodeState.Visited1);
            undraw.push(node);
            undraw.push(nodeState.Unvisited);
        }
        if (!this.result.dijkstraPath.length) { // Render Unsolveable tiles
            for (var _b = 0, _c = this.result.dijkstraVisit; _b < _c.length; _b++) {
                var node = _c[_b];
                draw.push(node);
                draw.push(nodeState.Unsolvable);
                undraw.push(node);
                undraw.push(nodeState.Visited1);
            }
        }
        else {
            for (var _d = 0, _e = this.result.dijkstraPath; _d < _e.length; _d++) { // Render Path tiles
                var node = _e[_d];
                draw.push(node);
                draw.push(nodeState.Path1);
                undraw.push(node);
                undraw.push(nodeState.Visited1);
            }
        }
        this.dDraw = draw;
        this.dUndraw = undraw;
        draw = new Array(); // Do it again for A*
        undraw = new Array();
        for (var _f = 0, _g = this.result.aStarVisit; _f < _g.length; _f++) {
            var node = _g[_f];
            draw.push(node);
            draw.push(nodeState.Visited2);
            undraw.push(node);
            undraw.push(nodeState.Unvisited);
        }
        if (!this.result.aStarPath.length) {
            for (var _h = 0, _j = this.result.aStarVisit; _h < _j.length; _h++) {
                var node = _j[_h];
                draw.push(node);
                draw.push(nodeState.Unsolvable);
                undraw.push(node);
                undraw.push(nodeState.Visited2);
            }
        }
        else {
            for (var _k = 0, _l = this.result.aStarPath; _k < _l.length; _k++) {
                var node = _l[_k];
                draw.push(node);
                draw.push(nodeState.Path2);
                undraw.push(node);
                undraw.push(nodeState.Visited2);
            }
        }
        this.aDraw = draw;
        this.isRunning = false;
        if (this.autoOn)
            this.draw();
    };
    Visualizer.prototype.renderTimeout = function (count) {
        var _this = this;
        if (this.result.isDone())
            this.render();
        else if (count > 20)
            console.log("timeout: render failed");
        else {
            setTimeout(function () { _this.renderTimeout(count + 1); }, 500);
        }
    };
    return Visualizer;
}());
// Pathfinding Algorithms and Components: ////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var PathNode = /** @class */ (function () {
    function PathNode() {
        this.distance = Infinity;
        this.cost = Infinity;
        this.isObstacle = false;
        this.isVisited = false;
        this.previous = null;
    }
    return PathNode;
}());
var PathFind = /** @class */ (function () {
    function PathFind() {
        this.dijkstraPath = new Array();
        this.dijkstraVisit = new Array();
        this.aStarPath = new Array();
        this.aStarVisit = new Array();
        this.updateCount = 0;
        this.grid = new Array();
        this.start = null;
        this.end = null;
        this.done = false;
        this.dijkstraDone = false;
    }
    PathFind.prototype.getDijkstraPath = function () { return this.dijkstraPath; };
    PathFind.prototype.getDijkstraVisit = function () { return this.dijkstraVisit; };
    PathFind.prototype.getAStarPath = function () { return this.aStarPath; };
    PathFind.prototype.getAStarVisit = function () { return this.aStarVisit; };
    PathFind.prototype.isDone = function () { return this.done; };
    PathFind.prototype.update = function (map, startNode, endNode) {
        console.log("calculating paths...");
        this.updateCount++;
        var convNodeID = 0;
        for (var _i = 0, map_1 = map; _i < map_1.length; _i++) {
            var node = map_1[_i];
            var convNode = new PathNode;
            var state = node.getState();
            if (state === nodeState.Obstacle)
                convNode.isObstacle = true;
            else if (state === nodeState.Start) {
                convNode.distance = 0;
                convNode.cost = 0;
            }
            convNode.id = convNodeID;
            convNodeID++;
            this.grid.push(convNode);
        }
        this.start = this.grid[startNode];
        this.end = this.grid[endNode];
        this.dijkstra();
        this.runNext();
    };
    PathFind.prototype.runNext = function () {
        var _this = this;
        if (this.dijkstraDone) {
            this.reset();
            this.aStar();
        }
        else
            setTimeout(function () { _this.runNext(); }, 0);
    };
    PathFind.prototype.dijkstra = function () {
        var visitedNodesInOrder = [];
        var unvisitedNodes = this.getAllNodes();
        while (!!unvisitedNodes.length) {
            this.sortNodesByDistance(unvisitedNodes);
            var closestNode = unvisitedNodes.shift();
            if (closestNode.isObstacle)
                continue;
            if (closestNode.distance === Infinity) {
                this.dijkstraDone = true;
                break;
            }
            closestNode.isVisited = true;
            visitedNodesInOrder.push(closestNode);
            //console.log("visited " + closestNode.id);
            this.dijkstraVisit.push(closestNode.id);
            if (closestNode === this.end) {
                this.drawDijkstraPath(this.end);
                break;
            }
            this.updateUnvisitedNeighbors(closestNode, false);
        }
        this.dijkstraVisit.shift(); // remove
        this.dijkstraVisit.pop();
    };
    PathFind.prototype.aStar = function () {
        var visitedNodesInOrder = [];
        var unvisitedNodes = this.getAllNodes();
        while (!!unvisitedNodes.length) {
            this.sortNodesByCost(unvisitedNodes);
            var closestNode = unvisitedNodes.shift();
            if (closestNode.isObstacle)
                continue;
            if (closestNode.cost === Infinity) {
                this.done = true;
                break;
            }
            closestNode.isVisited = true;
            visitedNodesInOrder.push(closestNode);
            this.aStarVisit.push(closestNode.id);
            if (closestNode === this.end) {
                this.drawAStarPath(this.end);
                break;
            }
            this.updateUnvisitedNeighbors(closestNode, true);
        }
        this.aStarVisit.shift();
        this.aStarVisit.pop();
    };
    PathFind.prototype.sortNodesByDistance = function (unvisitedNodes) {
        unvisitedNodes.sort(function (nodeA, nodeB) { return nodeA.distance - nodeB.distance; });
    };
    PathFind.prototype.sortNodesByCost = function (unvisitedNodes) {
        unvisitedNodes.sort(function (nodeA, nodeB) { return nodeA.cost - nodeB.cost; });
    };
    PathFind.prototype.updateUnvisitedNeighbors = function (node, useHeuristics) {
        var unvisitedNeighbors = this.getNeighbors(node);
        for (var _i = 0, unvisitedNeighbors_1 = unvisitedNeighbors; _i < unvisitedNeighbors_1.length; _i++) {
            var neighbor = unvisitedNeighbors_1[_i];
            neighbor.distance = node.distance + 1;
            if (useHeuristics) {
                var estimatedDistance = this.estimateDistance(neighbor.id);
                neighbor.cost = estimatedDistance * heuristicWeight + neighbor.distance;
            }
            neighbor.previous = node;
        }
    };
    PathFind.prototype.getAllNodes = function () {
        var nodes = [];
        for (var _i = 0, _a = this.grid; _i < _a.length; _i++) {
            var node = _a[_i];
            nodes.push(node);
        }
        return nodes;
    };
    PathFind.prototype.drawDijkstraPath = function (end) {
        var nodesInShortestPathOrder = [];
        var currentNode = end;
        while (currentNode !== null) {
            nodesInShortestPathOrder.unshift(currentNode);
            currentNode = currentNode.previous;
        }
        for (var _i = 0, nodesInShortestPathOrder_1 = nodesInShortestPathOrder; _i < nodesInShortestPathOrder_1.length; _i++) {
            var node = nodesInShortestPathOrder_1[_i];
            this.dijkstraPath.push(node.id);
        }
        this.dijkstraPath.shift(); // remove the start and end nodes
        this.dijkstraPath.pop();
        this.dijkstraDone = true;
        console.log("dijkstra: " + this.dijkstraPath.length + " " + this.dijkstraVisit.length);
    };
    PathFind.prototype.drawAStarPath = function (end) {
        var nodesInShortestPathOrder = [];
        var currentNode = end;
        while (currentNode !== null) {
            nodesInShortestPathOrder.unshift(currentNode);
            currentNode = currentNode.previous;
        }
        for (var _i = 0, nodesInShortestPathOrder_2 = nodesInShortestPathOrder; _i < nodesInShortestPathOrder_2.length; _i++) {
            var node = nodesInShortestPathOrder_2[_i];
            this.aStarPath.push(node.id);
        }
        this.aStarPath.shift(); // remove the start and end nodes
        this.aStarPath.pop();
        this.done = true;
        console.log("astar: " + this.aStarPath.length + " " + this.aStarVisit.length);
    };
    PathFind.prototype.estimateDistance = function (node) {
        var end = this.end.id;
        var current = node;
        var distance = 0;
        while (current % rowSize < end % rowSize) {
            current++;
            distance++;
        }
        while (current % rowSize > end % rowSize) {
            current--;
            distance++;
        }
        while (current < end) {
            current += rowSize;
            distance++;
        }
        while (current > end) {
            current -= rowSize;
            distance++;
        }
        return distance;
    };
    PathFind.prototype.getNeighbors = function (targetNode) {
        var neighbors = new Array;
        var target = targetNode.id;
        if (target - 1 >= 0 && target % rowSize !== 0 && this.grid[target - 1].isVisited == false) // left
            neighbors.push(this.grid[target - 1]);
        if (target + 1 >= 0 && (target + 1) % rowSize !== 0 && this.grid[target + 1].isVisited == false) // right
            neighbors.push(this.grid[target + 1]);
        if (target - rowSize >= 0 && this.grid[target - rowSize].isVisited == false) // top
            neighbors.push(this.grid[target - rowSize]);
        if (target + rowSize < visSize && this.grid[target + rowSize].isVisited == false) // bottom
            neighbors.push(this.grid[target + rowSize]);
        return neighbors;
    };
    PathFind.prototype.reset = function () {
        for (var _i = 0, _a = this.grid; _i < _a.length; _i++) {
            var node = _a[_i];
            if (node.distance !== 0)
                node.distance = Infinity;
            node.isVisited = false;
            node.previous = null;
        }
    };
    return PathFind;
}());
// Controls:                               ///////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function start() {
    visualizer.clear();
    if (visualizer.autoOn)
        generate();
    visualizer.run();
}
function halt() {
    visualizer.autoOn = false;
    visualizer.stop();
}
function auto() {
    var autoCheckbox = document.querySelector('#auto');
    visualizer.autoOn = autoCheckbox.checked;
}
function comparisons() {
    var comparisonCheckbox = document.querySelector('#compare');
    visualizer.comparisonOn = comparisonCheckbox.checked;
}
function dijkstra() {
    visualizer.setMode(visMode.Dijkstra);
    visualizer.clear();
    visualizer.draw();
}
function aStar() {
    visualizer.setMode(visMode.AStar);
    visualizer.clear();
    visualizer.draw();
}
function set() {
    visualizer.place(nodeState.Start);
}
function generate() {
    visualizer.generateTest();
}
function resetVis() {
    visualizer.reset();
    visualizer.place(nodeState.Start);
}
function clearVis() {
    visualizer.clear();
    visualizer.place(nodeState.Start);
}
function setSpeed(speed) {
    var crawl = 0;
    var slow = 1;
    var normal = 2;
    var fast = 3;
    (speed == crawl) ? (visitAnimationSpeed = 100, pathAnimationSpeed = 200) :
        (speed == slow) ? (visitAnimationSpeed = 50, pathAnimationSpeed = 100) :
            (speed == normal) ? (visitAnimationSpeed = 10, pathAnimationSpeed = 20) :
                (speed == fast) ? (visitAnimationSpeed = 1, pathAnimationSpeed = 20) :
                    (visitAnimationSpeed = 0, pathAnimationSpeed = 0);
}
function newVis(newSize) {
    visualizer.div.parentElement.removeChild(visualizer.div);
    if (newSize > 200)
        alert("Running the visualizer on this setting make take a while.");
    var containerSize = '500px';
    var nodeSize = '20%';
    var buttonSize = '10pt';
    if (newSize == 10) {
        nodeSize = '10%';
    }
    else if (newSize == 50) {
        nodeSize = '2%';
    }
    else if (newSize == 100) {
        nodeSize = '1%';
    }
    else if (newSize == 200) {
        nodeSize = '0.5%';
        containerSize = '1000px';
        buttonSize = '20pt';
    }
    else if (newSize == 500) {
        nodeSize = "0.2%";
        containerSize = '2000px';
        buttonSize = '40pt';
    }
    rowSize = newSize;
    visSize = rowSize * rowSize;
    var root = document.querySelector(':root');
    root.style.setProperty('--nodeSize', nodeSize);
    root.style.setProperty('--containerSize', containerSize);
    root.style.setProperty('--buttonSize', buttonSize);
    visualizer = new Visualizer;
    auto();
    comparisons();
}
// Runtime:                                ///////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var visualizer = new Visualizer; // Start the visualizer
