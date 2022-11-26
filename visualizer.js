// Config:                               //////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var rowSize = 50; // Adjust the map size with rowSize
var visSize = rowSize * rowSize; // Map size = rowSize^2
var visitAnimationSpeed = 1;
var pathAnimationSpeed = 20;
var autoResetSpeed = 1000;
var pathfindSpeed = 5000; // How long does pathfinding take???
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
    };
    Visualizer.prototype.auto = function () {
        var _this = this;
        if (!this.isRunning) {
            this.isRunning = true;
            visualizer.reset(); // Create a fresh maze
            visualizer.generateTest();
            console.clear();
            setTimeout(function () { visualizer.run(); }, 0); // Crashes without the timeout for some reason
            this.auto();
        }
        if (this.isRunning) {
            setTimeout(function () { _this.auto(); }, 500);
        }
    };
    Visualizer.prototype.draw = function (result) {
        var _this = this;
        var dVisited = result.getDijkstraVisit();
        var dPath = result.getDijkstraPath();
        var aVisited = result.getAStarVisit();
        var aPath = result.getAStarPath();
        var timing = 0;
        var _loop_1 = function (node) {
            setTimeout(function () {
                if (node !== _this.startNode && node !== _this.endNode)
                    _this.map[node].setState(nodeState.Visited1);
            }, timing);
            timing += visitAnimationSpeed;
        };
        for (var _i = 0, dVisited_1 = dVisited; _i < dVisited_1.length; _i++) {
            var node = dVisited_1[_i];
            _loop_1(node);
        }
        if (dPath.length < 1) {
            setTimeout(function () {
                for (var _i = 0, dVisited_2 = dVisited; _i < dVisited_2.length; _i++) {
                    var node = dVisited_2[_i];
                    if (node !== _this.startNode && node !== _this.endNode)
                        _this.map[node].setState(nodeState.Unsolvable);
                }
            }, timing);
        }
        else {
            var _loop_2 = function (node) {
                setTimeout(function () {
                    if (node !== _this.startNode && node !== _this.endNode)
                        _this.map[node].setState(nodeState.Path1);
                }, timing);
                timing += pathAnimationSpeed;
            };
            for (var _a = 0, dPath_1 = dPath; _a < dPath_1.length; _a++) {
                var node = dPath_1[_a];
                _loop_2(node);
            }
            timing += autoResetSpeed;
        }
        timing += autoResetSpeed;
        var _loop_3 = function (node) {
            setTimeout(function () {
                if (node !== _this.startNode && node !== _this.endNode && _this.map[node].getState() !== nodeState.Path1)
                    _this.map[node].setState(nodeState.Visited2);
            }, timing);
            timing += visitAnimationSpeed;
        };
        for (var _b = 0, aVisited_1 = aVisited; _b < aVisited_1.length; _b++) {
            var node = aVisited_1[_b];
            _loop_3(node);
        }
        if (aPath.length < 1) {
            setTimeout(function () {
                for (var _i = 0, aVisited_2 = aVisited; _i < aVisited_2.length; _i++) {
                    var node = aVisited_2[_i];
                    if (node !== _this.startNode && node !== _this.endNode)
                        _this.map[node].setState(nodeState.Unsolvable);
                }
            }, timing);
        }
        else {
            var _loop_4 = function (node) {
                setTimeout(function () {
                    if (node !== _this.startNode && node !== _this.endNode)
                        _this.map[node].setState(nodeState.Path2);
                }, timing);
                timing += pathAnimationSpeed;
            };
            for (var _c = 0, aPath_1 = aPath; _c < aPath_1.length; _c++) {
                var node = aPath_1[_c];
                _loop_4(node);
            }
        }
        setTimeout(function () { _this.isRunning = false; }, timing + autoResetSpeed);
    };
    Visualizer.prototype.run = function () {
        this.isRunning = true;
        var run = new PathFind;
        this.result = run;
        run.update(this.map, this.startNode, this.endNode);
        this.render();
    };
    Visualizer.prototype.render = function () {
        console.log("rendering result");
        if (this.result.isDone()) {
            this.draw(this.result);
        }
        else
            this.renderTimeout(0);
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
        this.diffPathTotal = 0;
        this.diffVisitTotal = 0;
        this.diffPathAvg = 0;
        this.diffVisitAvg = 0;
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
        if (this.dijkstraDone && this.dijkstraPath.length > 0) {
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
                this.done = true;
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
            this.updateUnvisitedNeighbors(closestNode);
        }
    };
    PathFind.prototype.aStar = function () {
        var visitedNodesInOrder = [];
        var unvisitedNodes = this.getAllNodes();
        while (!!unvisitedNodes.length) {
            this.sortNodesByCost(unvisitedNodes);
            var closestNode = unvisitedNodes.shift();
            if (closestNode.isObstacle)
                continue;
            if (closestNode.distance === Infinity) {
                this.done = true;
                break;
            }
            closestNode.isVisited = true;
            visitedNodesInOrder.push(closestNode);
            //console.log("visited " + closestNode.id);
            this.aStarVisit.push(closestNode.id);
            if (closestNode === this.end) {
                this.drawAStarPath(this.end);
                break;
            }
            this.updateUnvisitedNeighbors(closestNode);
        }
    };
    PathFind.prototype.sortNodesByDistance = function (unvisitedNodes) {
        unvisitedNodes.sort(function (nodeA, nodeB) { return nodeA.distance - nodeB.distance; });
    };
    PathFind.prototype.sortNodesByCost = function (unvisitedNodes) {
        unvisitedNodes.sort(function (nodeA, nodeB) { return nodeA.cost - nodeB.cost; });
    };
    PathFind.prototype.updateUnvisitedNeighbors = function (node) {
        var unvisitedNeighbors = this.getNeighbors(node);
        for (var _i = 0, unvisitedNeighbors_1 = unvisitedNeighbors; _i < unvisitedNeighbors_1.length; _i++) {
            var neighbor = unvisitedNeighbors_1[_i];
            neighbor.distance = node.distance + 1;
            neighbor.cost = neighbor.distance + this.estimateDistance(neighbor.id);
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
        this.done = true;
        console.log("astar: " + this.aStarPath.length + " " + this.aStarVisit.length);
        var diffPath = this.dijkstraPath.length - this.aStarPath.length;
        var diffVisit = this.dijkstraVisit.length - this.aStarVisit.length;
        this.diffPathTotal += diffPath;
        this.diffVisitTotal += diffVisit;
        this.diffPathAvg = this.diffPathTotal / this.updateCount;
        this.diffVisitAvg = this.diffVisitTotal / this.updateCount;
        console.log("difference: " + diffPath + " " + diffVisit);
        console.log("average: " + this.diffPathAvg + " " + this.diffVisitAvg);
    };
    PathFind.prototype.estimateDistance = function (node) {
        var end = this.end.id;
        var location = node.id;
        var distance = 0;
        var x = 0;
        var y = 0;
        while (location > rowSize) {
            location -= rowSize;
            x++;
        }
        while (end > rowSize) {
            end -= rowSize;
            y++;
        }
        distance += Math.abs(x - y);
        x = 0;
        y = 0;
        while (location > 0) {
            location -= 1;
            x++;
        }
        while (end > 0) {
            end -= 1;
            y++;
        }
        distance += Math.abs(x - y);
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
// Runtime: //////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var visualizer = new Visualizer; // Start the visualizer
visualizer.auto();
