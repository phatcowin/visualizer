// Config:                               //////////////////////////////////////////////////////////////////////////
var rowSize = 50; // Adjust the map size with rowSize
var visSize = rowSize * rowSize; // Map size = rowSize^2
var visitAnimationSpeed = 1;
var pathAnimationSpeed = 20;
var autoResetSpeed = 1000;
var pathfindSpeed = 5000; // How long does pathfinding take???
var showNodeNumber = false;
// Visualizer Components and Properties: //////////////////////////////////////////////////////////////////////////
var nodeState;
(function (nodeState) {
    nodeState[nodeState["Unvisited"] = 0] = "Unvisited";
    nodeState[nodeState["Visited"] = 1] = "Visited";
    nodeState[nodeState["Obstacle"] = 2] = "Obstacle";
    nodeState[nodeState["Start"] = 3] = "Start";
    nodeState[nodeState["End"] = 4] = "End";
    nodeState[nodeState["Path"] = 5] = "Path";
    nodeState[nodeState["Unsolvable"] = 6] = "Unsolvable";
})(nodeState || (nodeState = {}));
var visMode;
(function (visMode) {
    visMode[visMode["None"] = 0] = "None";
    visMode[visMode["Auto"] = 1] = "Auto";
    visMode[visMode["Dijkstra"] = 2] = "Dijkstra";
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
        else if (newState === nodeState.Visited)
            this.div.style.backgroundColor = 'var(--visited)';
        else if (newState === nodeState.Obstacle)
            this.div.style.backgroundColor = 'var(--obstacle)';
        else if (newState === nodeState.Start)
            this.div.style.backgroundColor = 'var(--start)';
        else if (newState === nodeState.End)
            this.div.style.backgroundColor = 'var(--end)';
        else if (newState === nodeState.Path)
            this.div.style.backgroundColor = 'var(--path)';
        else if (newState === nodeState.Unsolvable)
            this.div.style.backgroundColor = 'var(--unsolvable)';
    };
    visNode.prototype.setPreviousNode = function (newNode) {
        this.previousNode = newNode;
        this.div.setAttribute("previous-node", "" + newNode);
    };
    visNode.prototype.getPreviousNode = function () {
        return this.previousNode;
    };
    visNode.prototype.getNodeNumber = function () {
        return this.nodeID;
    };
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
        this.inputMode = nodeState.Obstacle; // When a user clicks, what are they trying to place?
        this.autoTimeout = 1;
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
    Visualizer.prototype.getNode = function (targetNode) {
        return this.map[targetNode].getState();
    };
    Visualizer.prototype.generate10xTest = function () {
        this.reset();
        this.setNode(73, nodeState.Start);
        this.setNode(18, nodeState.End);
        this.setNode(23, nodeState.Obstacle);
        this.setNode(34, nodeState.Obstacle);
        this.setNode(44, nodeState.Obstacle);
        this.setNode(45, nodeState.Obstacle);
        this.setNode(55, nodeState.Obstacle);
        this.setNode(56, nodeState.Obstacle);
        this.setNode(58, nodeState.Obstacle);
        this.setNode(0, nodeState.Obstacle);
    };
    Visualizer.prototype.generate5xTest = function () {
        this.reset();
        this.setNode(0, nodeState.Start);
        this.setNode(24, nodeState.End);
        this.setNode(11, nodeState.Obstacle);
        this.setNode(12, nodeState.Obstacle);
        this.setNode(13, nodeState.Obstacle);
    };
    Visualizer.prototype.generateRandomTest = function () {
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
    Visualizer.prototype.generateTest = function () {
        if (rowSize === 5)
            this.generate5xTest();
        else if (rowSize === 10)
            this.generateRandomTest();
        else
            this.generateRandomTest();
    };
    Visualizer.prototype.clear = function () {
        for (var i = 0; i < visSize; i++) { // Use between different runs on the same map
            if (this.map[i].getState() === nodeState.Visited
                || this.map[i].getState() === nodeState.Path
                || this.map[i].getState() === nodeState.Unsolvable) {
                this.map[i].setState(nodeState.Unvisited);
            }
        }
    };
    Visualizer.prototype.reset = function () {
        for (var i = 0; i < visSize; i++) {
            this.map[i].setState(nodeState.Unvisited);
        }
    };
    Visualizer.prototype.place = function (newInputMode) {
        this.inputMode = newInputMode;
    };
    Visualizer.prototype.toggle = function (targetNode) {
        if (this.isRunning) { } // Don't toggle nodes while an algorithm is running
        else if (this.inputMode === nodeState.Obstacle)
            this.setNode(targetNode, nodeState.Obstacle);
        else if (this.inputMode === nodeState.Start)
            this.setNode(targetNode, nodeState.Start);
        else if (this.inputMode === nodeState.End)
            this.setNode(targetNode, nodeState.End);
    };
    Visualizer.prototype.setMode = function (newMode) {
        this.mode = newMode;
    };
    Visualizer.prototype.stop = function () {
        this.isRunning = false;
    };
    Visualizer.prototype.auto = function () {
        var _this = this;
        if (!this.isRunning) {
            this.isRunning = true;
            visualizer.reset();
            visualizer.generateTest();
            setTimeout(function () { visualizer.run(); }, 0); // Crashes without the timeout 
            this.auto();
            this.autoTimeout++;
        }
        if (this.isRunning) {
            setTimeout(function () { _this.auto(); }, 500);
        }
    };
    Visualizer.prototype.draw = function (visited, path) {
        var _this = this;
        var visitTiming = 0;
        var pathTiming = 0;
        var _loop_1 = function (node) {
            setTimeout(function () {
                if (node !== _this.startNode && node !== _this.endNode)
                    _this.map[node].setState(nodeState.Visited);
            }, visitTiming);
            visitTiming += visitAnimationSpeed;
        };
        for (var _i = 0, visited_1 = visited; _i < visited_1.length; _i++) {
            var node = visited_1[_i];
            _loop_1(node);
        }
        if (path.length < 1) {
            setTimeout(function () {
                for (var _i = 0, visited_2 = visited; _i < visited_2.length; _i++) {
                    var node = visited_2[_i];
                    if (node !== _this.startNode && node !== _this.endNode)
                        _this.map[node].setState(nodeState.Unsolvable);
                }
            }, visitTiming);
        }
        else {
            var _loop_2 = function (node) {
                setTimeout(function () {
                    if (node !== _this.startNode && node !== _this.endNode)
                        _this.map[node].setState(nodeState.Path);
                }, visitTiming + pathTiming);
                pathTiming += pathAnimationSpeed;
            };
            for (var _a = 0, path_1 = path; _a < path_1.length; _a++) {
                var node = path_1[_a];
                _loop_2(node);
            }
        }
        setTimeout(function () { _this.isRunning = false; }, pathTiming + visitTiming + autoResetSpeed);
    };
    Visualizer.prototype.run = function () {
        this.isRunning = true;
        var run = new PathFind;
        this.result = run;
        run.update(this.map, this.startNode, this.endNode);
        this.result.dijkstra();
        this.render();
    };
    Visualizer.prototype.render = function () {
        if (this.result.isDone())
            this.draw(this.result.getDijkstraVisit(), this.result.getDijkstraPath());
        else
            this.renderTimeout(0);
        delete this.result;
    };
    Visualizer.prototype.renderTimeout = function (count) {
        var _this = this;
        console.log("result not done");
        if (this.result.isDone())
            this.render();
        else if (count > 20)
            console.log("timeout: render failed");
        else {
            setTimeout(function () {
                _this.renderTimeout(count + 1);
            }, 500);
        }
    };
    Visualizer.prototype.testRender = function () {
        this.draw(testDraw(), testDraw());
    };
    return Visualizer;
}());
var visualizer = new Visualizer; // Start the visualizer
visualizer.auto();
function testDraw() {
    var path = new Array;
    for (var i = 0; i < 10; i++)
        path.push(i + 10);
    return path;
}
// Pathfinding Algorithms and Components: ////////////////////////////////////////////////////////////////////////
var PathNode = /** @class */ (function () {
    function PathNode() {
        this.distance = Infinity;
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
        this.grid = new Array();
        this.start = null;
        this.end = null;
        this.done = false;
    }
    PathFind.prototype.getDijkstraPath = function () { return this.dijkstraPath; };
    PathFind.prototype.getDijkstraVisit = function () { return this.dijkstraVisit; };
    PathFind.prototype.isDone = function () { return this.done; };
    PathFind.prototype.update = function (map, startNode, endNode) {
        var convNodeID = 0;
        for (var _i = 0, map_1 = map; _i < map_1.length; _i++) {
            var node = map_1[_i];
            var convNode = new PathNode;
            var state = node.getState();
            if (state === nodeState.Obstacle)
                convNode.isObstacle = true;
            else if (state === nodeState.Start)
                convNode.distance = 0;
            convNode.id = convNodeID;
            convNodeID++;
            this.grid.push(convNode);
        }
        this.start = this.grid[startNode];
        this.end = this.grid[endNode];
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
                this.done = true;
                break;
            }
            closestNode.isVisited = true;
            visitedNodesInOrder.push(closestNode);
            console.log("visited " + closestNode.id);
            this.dijkstraVisit.push(closestNode.id);
            if (closestNode === this.end) {
                this.drawDijkstraPath(this.end);
                break;
            }
            this.updateUnvisitedNeighbors(closestNode);
        }
    };
    PathFind.prototype.sortNodesByDistance = function (unvisitedNodes) {
        unvisitedNodes.sort(function (nodeA, nodeB) { return nodeA.distance - nodeB.distance; });
    };
    PathFind.prototype.updateUnvisitedNeighbors = function (node) {
        var unvisitedNeighbors = this.getNeighbors(node);
        for (var _i = 0, unvisitedNeighbors_1 = unvisitedNeighbors; _i < unvisitedNeighbors_1.length; _i++) {
            var neighbor = unvisitedNeighbors_1[_i];
            neighbor.distance = node.distance + 1;
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
        this.done = true;
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
