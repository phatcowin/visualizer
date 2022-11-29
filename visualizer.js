// Config:                               //////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var rowSize = 50; // Adjust the map size with rowSize
var visSize = rowSize * rowSize; // Map size = rowSize^2
var visitAnimationSpeed = 1; // Animation speeds
var pathAnimationSpeed = 20;
var autoResetSpeed = 1000; // Auto mode delay between pathfind visualizations
var heuristicWeight = 1; // Tune A* heuristic
var heuristicIsExponent = true;
var showNodeNumber = false; // Show the nodeIDs on the visualizer
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
        this.state = nodeState.Unvisited; // Each node has a state
        this.div = document.createElement('div'); // Create a tile for each node
        this.nodeID = null; // Create a unique ID to target node during click events
        this.nodeID = visNodeID; //   1. assign a node ID to the class
        this.div.setAttribute('visNodeID', visNodeID); //   2. assign an ID to the div
        this.div.className = "vis-node"; //   3. assign the vis-node class to the div
        if (showNodeNumber)
            this.div.innerHTML = visNodeID;
        var visContainer = document.getElementById('vis-container');
        if (visContainer) //   4. make sure the container exists for the div
            visContainer.appendChild(this.div); //   5. place the div in the container (places on DOM)
        else
            console.log("Error::visualizer.ts: visNode cannot be constructed without a visContainer");
        this.div.addEventListener("click", function (ev) {
            var element = ev.target; // Use node ID to target click
            var targetNode = parseInt(element.getAttribute('visNodeID')); //   event interactions
            visualizer.toggle(targetNode); // Clicking toggles the node's state
        });
    }
    visNode.prototype.getState = function () { return this.state; }; // Get our node's current state
    visNode.prototype.setState = function (newState) {
        this.state = newState;
        if (newState === nodeState.Unvisited)
            this.div.style.backgroundColor = 'var(--unvisited)'; // Div colors are stored in CSS variables
        else if (newState === nodeState.Visited1) //   for ease of adjustment
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
    visNode.prototype.getNodeNumber = function () { return this.nodeID; }; // Get our node ID
    return visNode;
}());
var Visualizer = /** @class */ (function () {
    function Visualizer() {
        this.map = new Array(); // Create our map
        this.div = document.createElement('div'); // Create a container for our visualizer
        this.startNode = -1; // Keep track of our start and end nodes
        this.endNode = -1;
        this.mode = visMode.Dijkstra; // Run mode (Dijkstra's, Auto, etc)
        this.isRunning = false; // True while the visualizer is pathfinding/rendering
        this.isDrawing = false; // True while the visualizer is drawing
        this.autoOn = false; // True while auto mode is enabled (controlled with checkbox)
        //         Auto Mode: continuously generate new maps,
        //                    visualize bfs/dijkstra and A*
        this.comparisonOn = false; // True while comparision mode is enabled (controlled with checkbox)
        //   Comparison Mode: don't clear visualizer between runs,
        //                    don't overwrite path tiles
        this.halted = false; // True while the visualizer is halted
        this.inputMode = nodeState.Obstacle; // Decides which state to set tiles on input
        this.current = 0; // CONCEPT: keeps track of current draw status for step slider
        this.totalPathDiff = 0; // Used to calculate the average difference between
        this.totalVisitDiff = 0; //   dijkstra/bfs between runs
        this.updateCount = 0; // Used to calulate average differences and as a run ID for halt
        this.dDraw = new Array(); // Draw arrays used to store visualizer steps
        this.dUndraw = new Array(); // CONCEPT: Undraw arrays used to reverse visualizer steps
        this.aDraw = new Array();
        this.aUndraw = new Array();
        document.body.appendChild(this.div); //   1. Place the container on the DOM
        this.div.className = 'map-container';
        this.div.setAttribute('id', 'vis-container'); //   2. Assign the vis-container class to the container
        for (var i = 0; i < visSize; i++) { //   3. Use the constructor to create visSize
            var newNode = new visNode(i); //      many visNodes and push them to our map
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
        var start = Math.floor(Math.random() * visSize); // Assign a random number between 0 and visSize to start/end
        var end = Math.floor(Math.random() * visSize);
        while (start === end) // Make sure our start and end don't overlap
            end = Math.floor(Math.random() * visSize);
        for (var i = 0; i < visSize * 0.4; i++) // Place 40% (or less) of the map in obstacles
            this.setNode(Math.floor(Math.random() * visSize), nodeState.Obstacle);
        this.setNode(start, nodeState.Start); // Place our start/end last so they aren't overwritten by
        this.setNode(end, nodeState.End); //   an obstacle.
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
            if (state !== nodeState.Start && // Dont overwrite start/end nodes or obstacles
                state !== nodeState.End &&
                state !== nodeState.Obstacle)
                node.setState(nodeState.Unvisited);
        }
    };
    Visualizer.prototype.toggle = function (targetNode) {
        if (this.isRunning || this.isDrawing)
            return; // Don't toggle nodes while the visualizer is busy
        else if (this.inputMode === nodeState.Obstacle)
            this.setNode(targetNode, nodeState.Obstacle);
        else if (this.inputMode === nodeState.Start) {
            this.setNode(targetNode, nodeState.Start);
            this.inputMode = nodeState.End; // After selecting a start node, select an end node
        }
        else if (this.inputMode === nodeState.End) {
            this.setNode(targetNode, nodeState.End);
            this.inputMode = nodeState.Obstacle; // After selecting an end node, place obstacles
        }
    };
    Visualizer.prototype.stop = function () {
        this.isRunning = false;
        this.halted = true;
    };
    Visualizer.prototype.auto = function () {
        var _this = this;
        if (this.halted)
            return; // Check for the stop signal is set, quit if it is
        if (this.isRunning || this.isDrawing) // Check if the visualizer is busy, try again in 500ms
            setTimeout(function () { _this.auto(); }, 500); //   if it is.
        else { // If the visualizer is ready, run it on a randomized map
            visualizer.generateTest();
            visualizer.run();
        }
    };
    Visualizer.prototype.draw = function () {
        var _this = this;
        this.isDrawing = true; // Indicate that we're drawing
        var runID = this.updateCount; // Use visualizer update count to create an id for this process
        var timing = 0; // Use a counter to time our animation
        var _loop_1 = function (i) {
            if ((this_1.mode === visMode.AStar // Don't draw dijktra/bfs when we're in A* mode,
                && !this_1.autoOn) || this_1.halted) //   unless we're in auto mode, or if we're halted
                return "break";
            var node = this_1.dDraw[i]; // Our target node is stored in the first slot
            var state = this_1.dDraw[i + 1]; // Our target state is stored in the second
            timing += (state === nodeState.Path1) ? pathAnimationSpeed : // Iterate our timing based on our target state
                visitAnimationSpeed; // and animation speed setting
            setTimeout(function () {
                if (!_this.halted && runID === _this.updateCount //   check if we've started a new drawing process
                    && !(_this.comparisonOn // Check if we're in comparison mode, and if so, check
                        && _this.map[node].getState() == nodeState.Path2 //   if there's a path already drawn here
                        && state == nodeState.Visited1))
                    _this.map[node].setState(state); // If all of these conditions are satifcatory, draw the node
            }, timing);
        };
        var this_1 = this;
        for (var i = 0; i < this.dDraw.length; i += 2) {
            var state_1 = _loop_1(i);
            if (state_1 === "break")
                break;
        }
        if (this.autoOn) { // If we're in auto mode,
            timing += autoResetSpeed; //   wait for the auto reset period,
            setTimeout(function () {
                if (!_this.comparisonOn && !_this.halted && //   and comparison mode is off and we're still
                    runID === _this.updateCount) //   drawing this process, clear the visualizer
                    _this.clear();
            }, timing);
        }
        var _loop_2 = function (i) {
            if ((this_2.mode === visMode.Dijkstra
                && !this_2.autoOn) || this_2.halted)
                return "break";
            var node = this_2.aDraw[i];
            var state = this_2.aDraw[i + 1];
            timing += (state === nodeState.Path2) ? pathAnimationSpeed :
                visitAnimationSpeed;
            setTimeout(function () {
                if (!_this.halted && runID === _this.updateCount
                    && !(_this.comparisonOn
                        && _this.map[node].getState() == nodeState.Path1
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
            if (runID === _this.updateCount) //   indicate that we're done drawing after
                _this.isDrawing = false; //   the reset timer
        }, timing + autoResetSpeed);
    };
    Visualizer.prototype.run = function () {
        console.clear(); // Clear the visualizer
        this.isRunning = true; // Indicate that we're running, resets after render
        if (this.halted)
            this.halted = false; // Reset our halt indicator
        var run = new PathFind; // Run and store our pathfinding results
        this.result = run;
        run.update(this.map, this.startNode, this.endNode);
        this.updateCount++; // Iterate our update counter
        var pathDiff = this.result.dijkstraPath.length - this.result.aStarPath.length; // Calculate the difference in
        var visitDiff = this.result.dijkstraVisit.length - this.result.aStarVisit.length; // our bfs/a* result this run
        this.totalPathDiff += pathDiff; // Calculate our average difference between all runs
        this.totalVisitDiff += visitDiff;
        var avgPath = this.totalPathDiff / this.updateCount;
        var avgVisit = this.totalVisitDiff / this.updateCount;
        console.log("difference: " + pathDiff + " " + visitDiff); // Output the differences and averages in the console
        console.log("average: " + avgPath + " " + avgVisit);
        this.render(); // Render our results
        if (this.autoOn) // Auto logic
            this.auto();
    };
    Visualizer.prototype.render = function () {
        console.log("rendering result"); // Indicate that we're rendering in the console
        var draw = new Array();
        for (var _i = 0, _a = this.result.dijkstraVisit; _i < _a.length; _i++) { // Render Visited tiles
            var node = _a[_i];
            draw.push(node); //   1. Store our target nodes in the first slot
            draw.push(nodeState.Visited1); //   2. Store our target states in the second slot
        }
        if (!this.result.dijkstraPath.length) { // If there is no path, render Unsolvable tiles
            for (var _b = 0, _c = this.result.dijkstraVisit; _b < _c.length; _b++) {
                var node = _c[_b];
                draw.push(node);
                draw.push(nodeState.Unsolvable);
            }
        }
        else {
            for (var _d = 0, _e = this.result.dijkstraPath; _d < _e.length; _d++) { // Render Path tiles
                var node = _e[_d];
                draw.push(node);
                draw.push(nodeState.Path1);
            }
        }
        this.dDraw = draw; // Store it!
        draw = new Array(); // Do it all again for A*
        for (var _f = 0, _g = this.result.aStarVisit; _f < _g.length; _f++) {
            var node = _g[_f];
            draw.push(node);
            draw.push(nodeState.Visited2);
        }
        if (!this.result.aStarPath.length) {
            for (var _h = 0, _j = this.result.aStarVisit; _h < _j.length; _h++) {
                var node = _j[_h];
                draw.push(node);
                draw.push(nodeState.Unsolvable);
            }
        }
        else {
            for (var _k = 0, _l = this.result.aStarPath; _k < _l.length; _k++) {
                var node = _l[_k];
                draw.push(node);
                draw.push(nodeState.Path2);
            }
        }
        this.aDraw = draw;
        this.isRunning = false; // Indicate we're done running
        if (this.autoOn)
            this.draw(); // Auto logic
    };
    return Visualizer;
}());
// Pathfinding Algorithms and Components: ////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var PathNode = /** @class */ (function () {
    function PathNode() {
        this.distance = Infinity; // Initialize cost/distance as Infinity so values with an
        this.cost = Infinity; //   assigned cost/distance get pushed to front during sort
        this.isObstacle = false;
        this.isVisited = false;
        this.previous = null; // Initialize previous nodes as null
    }
    return PathNode;
}());
var PathFind = /** @class */ (function () {
    function PathFind() {
        this.dijkstraPath = new Array(); // Store each algorithm's visited nodes
        this.dijkstraVisit = new Array(); //   and paths seperate arrays
        this.aStarPath = new Array();
        this.aStarVisit = new Array();
        this.grid = new Array(); // Visualizer's map, converted from visNodes to PathNodes
        this.end = null; // Keep track of our end node
        this.dijkstraDone = false; // True while dijkstra's is running
    }
    PathFind.prototype.getDijkstraPath = function () { return this.dijkstraPath; }; // Pass our paths and visited tiles to the visualizer
    PathFind.prototype.getDijkstraVisit = function () { return this.dijkstraVisit; };
    PathFind.prototype.getAStarPath = function () { return this.aStarPath; };
    PathFind.prototype.getAStarVisit = function () { return this.aStarVisit; };
    PathFind.prototype.update = function (map, startNode, endNode) {
        console.log("calculating paths...");
        var convNodeID = 0; // Convert each visNode to a PathNode and store it in the grid
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
        this.end = this.grid[endNode]; // Store our end node
        this.dijkstra(); // Run dijkstra
        this.runNext(); // Run A* when dijkstra is done
    };
    PathFind.prototype.runNext = function () {
        var _this = this;
        if (this.dijkstraDone) { // Check if dijkstra is done
            this.reset(); // Reset and run A* when it finishes
            this.aStar();
        }
        else
            setTimeout(function () { _this.runNext(); }, 500); // Otherwise, check again in 500ms
    };
    PathFind.prototype.dijkstra = function () {
        //   context, Dijkstra's and bfs are the same implementation.
        var unvisitedNodes = this.getAllNodes(); // Create an array to store our unvisited nodes
        while (!!unvisitedNodes.length) { // While there are nodes to visit...
            this.sortNodesByDistance(unvisitedNodes); //   1. Sort our nodes by their distance from the start
            var closestNode = unvisitedNodes.shift(); //   2. Find the closest node and remove it from the array
            console.log("bfs analyzing " + closestNode.id); //   3. Output which node we're visiting in the console
            if (closestNode.isObstacle)
                continue; //   4. Ignore this node if it's an obstacle
            if (closestNode.distance === Infinity) { //   5. Check if we're stuck (closest node's distance = Infinity)
                this.dijkstraDone = true; //      5.1. Indicate we've finished
                break; //      5.2. Exit
            }
            closestNode.isVisited = true; //   6. Indicate we've visited this node
            this.dijkstraVisit.push(closestNode.id); //   7. Push the node's id to our array of visited nodes
            if (closestNode === this.end) { //   8. Check if we've reached the end
                this.drawDijkstraPath(this.end); //      8.1. Find our path
                break; //      8.2. Exit
            }
            this.updateUnvisitedNeighbors(closestNode, false); // 9. Update the nodes adjacent to our current node
        }
        this.dijkstraVisit.shift(); //  10. Remove the start and end nodes from our results
        this.dijkstraVisit.pop();
    };
    PathFind.prototype.aStar = function () {
        //   of the distance from the start node and a weighted heuristic.
        //   The weight of the heuristic can be set by the user, and is
        //   based on the estimated distance from the end node.
        var unvisitedNodes = this.getAllNodes(); //   Same as dijkstra, but one minor difference...
        while (!!unvisitedNodes.length) {
            this.sortNodesByCost(unvisitedNodes); // Use cost instead of distance
            var closestNode = unvisitedNodes.shift();
            console.log("a* analyzing " + closestNode.id);
            if (closestNode.isObstacle)
                continue;
            if (closestNode.cost === Infinity) {
                break;
            }
            closestNode.isVisited = true;
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
        var unvisitedNeighbors = this.getNeighbors(node); // Get our unvisited neighbors
        for (var _i = 0, unvisitedNeighbors_1 = unvisitedNeighbors; _i < unvisitedNeighbors_1.length; _i++) {
            var neighbor = unvisitedNeighbors_1[_i];
            neighbor.distance = node.distance + 1; // Each unvisited neighbor is another node away from the start
            if (useHeuristics) { // If we're using A*, calculate the heuristic
                var estimatedDistance = this.estimateDistance(neighbor.id);
                var heuristic = (heuristicIsExponent) ? Math.pow(estimatedDistance, heuristicWeight) :
                    estimatedDistance * heuristicWeight;
                // If we're using exponential weighting, our heuristic is the
                //   estimated distance from the end node raised to the power of
                //   our weight. Otherwise, it's the product of the two.
                neighbor.cost = heuristic + neighbor.distance; // Our cost is the sum of our heuristic and
                //   our distance from the start node
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
        var currentNode = end; // Start at the end node
        while (currentNode !== null) { // Only the start node has a .previous value of null, so
            //   until we reach the start node...
            this.dijkstraPath.unshift(currentNode.id); //   1. Add this node to the start of our path array
            currentNode = currentNode.previous; //   2. Move to this node's previous node
        }
        this.dijkstraPath.shift(); // Remove the start and end nodes from our result
        this.dijkstraPath.pop();
        this.dijkstraDone = true; // Indicate that dijkstra's has finished running
        console.log("dijkstra: " + this.dijkstraPath.length + " " + this.dijkstraVisit.length);
        // Output how many nodes we visited and the length of our path
    };
    PathFind.prototype.drawAStarPath = function (end) {
        var currentNode = end; // Implementation mirrors drawDijkstraPath, with two differences:
        while (currentNode !== null) {
            this.aStarPath.unshift(currentNode.id); //   1. We store to a different array
            currentNode = currentNode.previous;
        }
        this.aStarPath.shift();
        this.aStarPath.pop(); //   2. No need to indicate when we're done
        console.log("astar: " + this.aStarPath.length + " " + this.aStarVisit.length);
    };
    PathFind.prototype.estimateDistance = function (node) {
        var end = this.end.id; //   and the end node
        var endX = end % rowSize; // Use modulus to identify our x values
        var nodeX = node % rowSize;
        var endY = (end - endX) / rowSize; // Subtract our x value, then use division to find our
        var nodeY = (node - nodeX) / rowSize; //   y values
        return Math.abs(nodeX - endX) + Math.abs(nodeY - endY); // Use these values to return the difference
        //   between their coordinates
    };
    PathFind.prototype.getNeighbors = function (targetNode) {
        var neighbors = new Array;
        var target = targetNode.id;
        if (target - 1 >= 0 && // Check if the left adjacent node is in bounds
            target % rowSize !== 0
            && this.grid[target - 1].isVisited == false) // Check if the left node is visited
            neighbors.push(this.grid[target - 1]); // Push it to our return array if these conditions are satisfied
        if (target + 1 >= 0 // Repeat for right adjacent node
            && (target + 1) % rowSize !== 0
            && this.grid[target + 1].isVisited == false)
            neighbors.push(this.grid[target + 1]);
        if (target - rowSize >= 0 && // Repeat for top adjacent node (requires one fewer bounds check)
            this.grid[target - rowSize].isVisited == false)
            neighbors.push(this.grid[target - rowSize]);
        if (target + rowSize < visSize // Repeat for bottom adjacent node (also requires one less check)
            && this.grid[target + rowSize].isVisited == false)
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
    var autoCheckbox = document.querySelector('#auto'); // Set based on whether the checkbox is checked
    visualizer.autoOn = autoCheckbox.checked;
}
function comparisons() {
    var comparisonCheckbox = document.querySelector('#compare'); // Set based on whether the checkbox is checked
    visualizer.comparisonOn = comparisonCheckbox.checked;
}
function dijkstra() {
    if (!visualizer.comparisonOn)
        visualizer.clear();
    visualizer.mode = visMode.Dijkstra;
    visualizer.draw();
}
function aStar() {
    if (!visualizer.comparisonOn)
        visualizer.clear();
    visualizer.mode = visMode.AStar;
    visualizer.draw();
}
function set() {
    visualizer.inputMode = nodeState.Start;
}
function generate() {
    visualizer.generateTest();
}
function resetVis() {
    newVis(rowSize);
}
function clearVis() {
    visualizer.clear();
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
    visualizer.div.parentElement.removeChild(visualizer.div); // Delete the existing visualizer from the DOM
    if (newSize > 200) // Warn users about running a visualizer with 0.25 million nodes
        alert("Running the visualizer on this setting make take a while.");
    var containerSize = '500px'; // Change CSS values to accomodate changing numbers of nodes
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
    rowSize = newSize; // Create a new visualizer with these new variables
    visSize = rowSize * rowSize;
    var root = document.querySelector(':root');
    root.style.setProperty('--nodeSize', nodeSize);
    root.style.setProperty('--containerSize', containerSize);
    root.style.setProperty('--buttonSize', buttonSize);
    visualizer = new Visualizer;
    auto(); // Make sure our settings still match our checkboxes
    comparisons();
}
function heuristicStrength(weight) {
    if (weight < 4) {
        heuristicIsExponent = false;
        if (weight == 3)
            weight++;
        heuristicWeight = weight;
    }
    else {
        heuristicIsExponent = true;
        heuristicWeight = 2;
    }
}
// Runtime:                                ///////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var visualizer = new Visualizer; // Start the visualizer
