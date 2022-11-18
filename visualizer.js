// Visualizer Components and Properties:
var rowSize = 100; // Adjust the map size with rowSize
var visSize = rowSize * rowSize; // Map size = rowSize^2
var nodeState;
(function (nodeState) {
    nodeState[nodeState["Unvisited"] = 0] = "Unvisited";
    nodeState[nodeState["Visited"] = 1] = "Visited";
    nodeState[nodeState["Obstacle"] = 2] = "Obstacle";
    nodeState[nodeState["Start"] = 3] = "Start";
    nodeState[nodeState["End"] = 4] = "End";
    nodeState[nodeState["Path"] = 5] = "Path";
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
        this.distance = Infinity;
        this.previousNode = null;
        this.nodeID = null;
        this.nodeID = visNodeID; //      Assign a nodeID to the class
        this.div.setAttribute('visNodeID', visNodeID); //      Assign an ID to the div
        this.div.className = "vis-node"; //      Assign the vis-node class to the div
        //this.div.innerHTML = visNodeID;
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
    };
    visNode.prototype.setDistance = function (newDist) {
        this.distance = newDist;
    };
    visNode.prototype.getDistance = function () {
        return this.distance;
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
                this.map[this.startNode].setDistance(Infinity);
            }
            this.startNode = targetNode;
            this.map[targetNode].setDistance(0);
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
        // Future Dalton: log all states and sets for slider!
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
        var end = visSize - Math.floor(Math.random() * visSize);
        for (var i = 0; i < rowSize * 2; i++)
            this.setNode(Math.floor(Math.random() * visSize), nodeState.Obstacle);
        this.setNode(start, nodeState.Start);
        this.setNode(end, nodeState.End);
    };
    Visualizer.prototype.generateTest = function () {
        if (rowSize === 5)
            this.generate5xTest();
        else if (rowSize === 10)
            this.generate10xTest();
        else
            this.generateRandomTest();
    };
    Visualizer.prototype.clear = function () {
        for (var i = 0; i < visSize; i++) { // Use between different runs on the same map
            if (this.map[i].getState() === nodeState.Visited
                || this.map[i].getState() === nodeState.Path) {
                this.map[i].setState(nodeState.Unvisited);
            }
        }
        // Future Dalton: reset step log!
    };
    Visualizer.prototype.reset = function () {
        for (var i = 0; i < visSize; i++) {
            this.map[i].setState(nodeState.Unvisited);
        }
        // Future Dalton: reset step log!
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
    Visualizer.prototype.run = function () {
        var _this = this;
        this.isRunning = false;
        if (this.mode === visMode.Auto) {
            this.generate10xTest();
            setTimeout(function () {
                _this.run();
            }, 500);
        }
        else if (this.mode === visMode.Dijkstra) {
            this.generateTest();
            setTimeout(function () {
                dijkstra(_this.map, _this.startNode, _this.endNode);
            }, 0);
        }
    };
    Visualizer.prototype.stop = function () {
        this.isRunning = false;
    };
    Visualizer.prototype.sandbox = function () {
        var testVal = -1;
        this.setNode(testVal, nodeState.Start);
        var testArray = getUnvisitedNeighbors(testVal, this.map);
        for (var _i = 0, testArray_1 = testArray; _i < testArray_1.length; _i++) {
            var neighbor = testArray_1[_i];
            this.map[neighbor].setState(nodeState.Path);
            console.log(neighbor);
        }
    };
    return Visualizer;
}());
function generateRandomMap() {
    visualizer.reset();
    var startNode = Math.floor(Math.random() * visSize);
    var endNode = Math.floor(Math.random() * visSize);
    var obstacle = Math.floor(Math.random() * visSize);
    while (startNode === endNode)
        endNode = Math.floor(Math.random() * visSize);
    visualizer.place(nodeState.Start);
    visualizer.toggle(startNode);
    visualizer.place(nodeState.End);
    visualizer.toggle(endNode);
    visualizer.place(nodeState.Obstacle);
    for (var i = 0; i < 2 * rowSize; i++) {
        visualizer.toggle(obstacle);
        obstacle = Math.floor(Math.random() * visSize);
    }
}
var visualizer = new Visualizer; // Start the visualizer
visualizer.run();
// Pathfinding Algorithms and Components: 
function dijkstra(map, startNode, endNode) {
    var unvisitedNodes = new Array;
    for (var i = 0; i < visSize; i++)
        unvisitedNodes.push(i);
    var loopCount = 0;
    var _loop_1 = function () {
        loopCount++;
        sortNodesByDistance(unvisitedNodes, map);
        var closestNode = unvisitedNodes.shift();
        //console.log("Loop count: " + loopCount + " closest node: " + closestNode);
        if (map[closestNode].getState() === nodeState.Obstacle)
            return "continue"; // Obstacle detection
        if (map[closestNode].getDistance() === Infinity)
            return "break"; // Trap detection
        if (map[closestNode].getState() !== nodeState.Start
            && map[closestNode].getState() !== nodeState.End)
            setTimeout(function () {
                map[closestNode].setState(nodeState.Visited); // Mark node visited
            }, loopCount * 100);
        if (closestNode === endNode) {
            console.log("Reached end node. " + endNode + " " + closestNode);
            console.log("Dijkstra complete: drawing path from " + endNode);
            setTimeout(function () {
                drawPath(endNode, map);
            }, loopCount * 5 + 100);
            return "break";
        }
        updateUnvisitedNeighbors(closestNode, map);
    };
    while (!!unvisitedNodes.length) {
        var state_1 = _loop_1();
        if (state_1 === "break")
            break;
    }
    visualizer.stop();
}
function sortNodesByDistance(unvisitedNodes, map) {
    unvisitedNodes.sort(function (nodeA, nodeB) { return map[nodeA].getDistance() - map[nodeB].getDistance(); });
    return unvisitedNodes;
}
function updateUnvisitedNeighbors(targetNode, map) {
    var unvisitedNeighbors = getUnvisitedNeighbors(targetNode, map);
    for (var _i = 0, unvisitedNeighbors_1 = unvisitedNeighbors; _i < unvisitedNeighbors_1.length; _i++) {
        var neighbor = unvisitedNeighbors_1[_i];
        map[neighbor].setDistance(map[targetNode].getDistance() + 1);
        map[neighbor].setPreviousNode(targetNode);
    }
}
function getUnvisitedNeighbors(targetNode, map) {
    var neighbors = new Array;
    if (targetNode - 1 >= 0 && targetNode % rowSize !== 0) { // Check left
        if (map[targetNode - 1].getState() !== nodeState.Visited)
            neighbors.push(targetNode - 1);
    }
    if (targetNode + 1 >= 0 && (targetNode + 1) % rowSize !== 0) { // Check right
        if (map[targetNode + 1].getState() !== nodeState.Visited)
            neighbors.push(targetNode + 1);
    }
    if (targetNode - rowSize >= 0) { // Check top
        if (map[targetNode - rowSize].getState() !== nodeState.Visited)
            neighbors.push(targetNode - rowSize);
    }
    if (targetNode + rowSize < visSize) { // Check bottom
        if (map[targetNode + rowSize].getState() !== nodeState.Visited)
            neighbors.push(targetNode + rowSize);
    }
    return neighbors;
}
function drawPath(endNode, map) {
    var path = [];
    var currentNode = endNode;
    var loopCount = 0;
    while (map[currentNode] !== null && loopCount < 10) {
        console.log("unshifting " + currentNode);
        path.unshift(currentNode);
        currentNode = map[currentNode].getPreviousNode();
        loopCount++;
    }
    for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
        var node = path_1[_i];
        if (map[node].getState() !== nodeState.Start
            && map[node].getState() !== nodeState.End)
            map[node].setState(nodeState.Path);
    }
}
