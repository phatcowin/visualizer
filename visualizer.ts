// Config:                               //////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let rowSize:number = 50;                                    // Adjust the map size with rowSize
let visSize:number = rowSize * rowSize;                     // Map size = rowSize^2
let visitAnimationSpeed:number = 1;                         // Animation speeds
let pathAnimationSpeed:number = 20;
let autoResetSpeed:number = 1000;                           // Auto mode delay between pathfind visualizations
let heuristicWeight:number = 1;                             // Tune A* heuristic
let heuristicIsExponent:boolean = true;
let showNodeNumber:boolean = false;                         // Show the nodeIDs on the visualizer

// Visualizer Components and Properties: /////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
enum nodeState {                                            // Create an enum to reference our node states
    Unvisited,                                              // Each node state is associated with a color in CSS
    Visited1,
    Visited2,
    Obstacle,
    Start,
    End,
    Path1,
    Path2,
    Unsolvable,
}

enum visMode {                                              // Select which path we're drawing
    Dijkstra,
    AStar,
}

class visNode {
    private state:nodeState = nodeState.Unvisited;          // Each node has a state
    private div = document.createElement('div');            // Create a tile for each node
    private nodeID:number = null;                           // Create a unique ID to target node during click events
    constructor(visNodeID) {                                // Initialize visNode: 
        this.nodeID = visNodeID;                            //   1. assign a node ID to the class
        this.div.setAttribute('visNodeID', visNodeID);      //   2. assign an ID to the div
        this.div.className = "vis-node";                    //   3. assign the vis-node class to the div
        if (showNodeNumber) this.div.innerHTML = visNodeID;
        let visContainer = document.getElementById('vis-container'); 
        if (visContainer)                                   //   4. make sure the container exists for the div
            visContainer.appendChild(this.div);             //   5. place the div in the container (places on DOM)
        else 
            console.log("Error::visualizer.ts: visNode cannot be constructed without a visContainer");

        this.div.addEventListener("click", (ev: MouseEvent) => { // Give each node a click event listener
            let element = ev.target as HTMLElement;                               // Use node ID to target click
            let targetNode:number = parseInt(element.getAttribute('visNodeID'));  //   event interactions
            visualizer.toggle(targetNode);                  // Clicking toggles the node's state
        });
    }
    public getState() { return this.state; }                // Get our node's current state
    public setState(newState:nodeState) {                   // When we set the node state, update the div color
        this.state = newState;
        if (newState === nodeState.Unvisited) 
            this.div.style.backgroundColor = 'var(--unvisited)';    // Div colors are stored in CSS variables
        else if (newState === nodeState.Visited1)                   //   for ease of adjustment
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
    }
    public getNodeNumber() { return this.nodeID; }          // Get our node ID
}

class Visualizer {
    public map = new Array<visNode>();                      // Create our map
    public div = document.createElement('div');             // Create a container for our visualizer
    public startNode:number = -1;                           // Keep track of our start and end nodes
    public endNode:number = -1;
    public mode:visMode = visMode.Dijkstra;                // Run mode (Dijkstra's, Auto, etc)
    private isRunning:boolean = false;                      // True while the visualizer is pathfinding/rendering
    private isDrawing:boolean = false;                      // True while the visualizer is drawing
    public autoOn:boolean = false;                          // True while auto mode is enabled (controlled with checkbox)
                                                            //         Auto Mode: continuously generate new maps,
                                                            //                    visualize bfs/dijkstra and A*
    public comparisonOn:boolean = false;                    // True while comparision mode is enabled (controlled with checkbox)
                                                            //   Comparison Mode: don't clear visualizer between runs,
                                                            //                    don't overwrite path tiles
    private halted:boolean = false;                         // True while the visualizer is halted
    public inputMode:nodeState = nodeState.Obstacle;        // Decides which state to set tiles on input
    public result:any;                                      // Stores the result from the previous run
    private current:number = 0;                             // CONCEPT: keeps track of current draw status for step slider
    private totalPathDiff:number = 0;                       // Used to calculate the average difference between
    private totalVisitDiff:number = 0;                      //   dijkstra/bfs between runs
    private updateCount:number = 0;                         // Used to calulate average differences and as a run ID for halt
    private dDraw = new Array<number>();                    // Draw arrays used to store visualizer steps
    private dUndraw = new Array<number>();                  // CONCEPT: Undraw arrays used to reverse visualizer steps
    private aDraw = new Array<number>();
    private aUndraw = new Array<number>();

    constructor() {                                         // Initialize visualizer
        document.body.appendChild(this.div);                //   1. Place the container on the DOM
        this.div.className = 'map-container';
        this.div.setAttribute('id', 'vis-container');       //   2. Assign the vis-container class to the container
        for (let i = 0; i < visSize; i++) {                 //   3. Use the constructor to create visSize
            let newNode = new visNode(i);                   //      many visNodes and push them to our map
            this.map.push(newNode);
        }
    }
    private setNode(targetNode:number, value:nodeState) {   // Set the status of a given node
        if (value === nodeState.Start) {                    // Only allow one start node
            if (this.startNode !== -1) {
                this.map[this.startNode].setState(nodeState.Unvisited);
            }
            this.startNode = targetNode;
        }
        else if (value === nodeState.End) {                 // Only allow one end node
            if (this.endNode !== -1)
                this.map[this.endNode].setState(nodeState.Unvisited);
            this.endNode = targetNode;
        }
        else if (value === nodeState.Obstacle) {
            if (targetNode === this.startNode)              // Dont allow Obstacle to overwrite Start/End
                value = nodeState.Start;
            else if (targetNode === this.endNode)
                value = nodeState.End;            
            else if (this.map[targetNode].getState() === value) // Toggle between Obstacle and Unvisited
                value = nodeState.Unvisited;
        }
        this.map[targetNode].setState(value);               // Set this node after duplicate checks
    }
    private getNode(targetNode:number) { return this.map[targetNode].getState(); }
    public generateTest() {                                 // Create a grid of randomly placed start, end, and obstacle nodes
        this.reset();
        let start = Math.floor(Math.random() * visSize);    // Assign a random number between 0 and visSize to start/end
        let end = Math.floor(Math.random() * visSize);
        while (start === end)                               // Make sure our start and end don't overlap
            end = Math.floor(Math.random() * visSize);
        for (let i = 0; i < visSize*0.4; i++)               // Place 40% (or less) of the map in obstacles
            this.setNode(Math.floor(Math.random() * visSize), nodeState.Obstacle);
        this.setNode(start, nodeState.Start);               // Place our start/end last so they aren't overwritten by
        this.setNode(end, nodeState.End);                   //   an obstacle.
    }
    public generateMaze() {                                 // CONCEPT: Generate a randomized, solvable maze
        let x = 0;
        let y = 0;
        for (y = 0; y < rowSize; y++) {
            for (x = 0; x < rowSize; x++) {
                if ((x%4 == 0 || y%4 == 0)) {
                    let target:visNode = this.map[y*rowSize + x];
                    target.setState(nodeState.Obstacle);
                }
            }
        }
        let target:number = 0;
        let state = nodeState.Obstacle;
        do {
            target = Math.floor(Math.random() * visSize);
            state = this.map[target].getState();
        } while (state == nodeState.Obstacle);
        this.map[target].setState(nodeState.Start);
        do {
            target = Math.floor(Math.random() * visSize) 
            state = this.map[target].getState();
        } while (state == nodeState.Obstacle || state == nodeState.Start);
        this.map[target].setState(nodeState.End);
        

    }
    public reset() {                                        // Create a fresh board for auto mode
        for (const node of this.map)
            node.setState(nodeState.Unvisited);
    }
    public clear() {                                        // Clear all pathfinding states from the map
        for (const node of this.map) {
            let state = node.getState();
            if (state !== nodeState.Start &&                // Dont overwrite start/end nodes or obstacles
                state !== nodeState.End &&
                state !== nodeState.Obstacle)
                node.setState(nodeState.Unvisited);
        }
    }
  
    public toggle(targetNode:number) {                      // Toggle nodes from user input
        if (this.isRunning || this.isDrawing) return;       // Don't toggle nodes while the visualizer is busy
        else if (this.inputMode === nodeState.Obstacle) 
            this.setNode(targetNode, nodeState.Obstacle);
        else if (this.inputMode === nodeState.Start) {
            this.setNode(targetNode, nodeState.Start);
            this.inputMode = nodeState.End;                 // After selecting a start node, select an end node
        }
        else if (this.inputMode === nodeState.End) {
            this.setNode(targetNode, nodeState.End);
            this.inputMode = nodeState.Obstacle;            // After selecting an end node, place obstacles
        }
    }
  
    public stop() {                                         // Used to stop Auto Mode
        this.isRunning = false;
        this.halted = true;
    }
    private auto() {                                        // Auto logic
        if (this.halted) return;                            // Check for the stop signal is set, quit if it is
        if (this.isRunning || this.isDrawing)               // Check if the visualizer is busy, try again in 500ms
            setTimeout(() => { this.auto(); }, 500);        //   if it is.
        else {                                              // If the visualizer is ready, run it on a randomized map
            visualizer.generateTest();
            visualizer.run();
        }
    }

    public draw() {                                         // Draw rendered results on the visualizer
        this.isDrawing = true;                              // Indicate that we're drawing
        let runID = this.updateCount;                       // Use visualizer update count to create an id for this process
        let timing = 0;                                     // Use a counter to time our animation
        for (let i = 0; i < this.dDraw.length; i += 2) {    // draw arrays store 2 values, so iterate by 2
            if ((this.mode === visMode.AStar                // Don't draw dijktra/bfs when we're in A* mode,
                && !this.autoOn) || this.halted)            //   unless we're in auto mode, or if we're halted
                break;
            let node = this.dDraw[i];                       // Our target node is stored in the first slot
            let state = this.dDraw[i+1];                    // Our target state is stored in the second
            timing += (state === nodeState.Path1) ? pathAnimationSpeed :    // Iterate our timing based on our target state
                                                    visitAnimationSpeed;    // and animation speed setting
            setTimeout(()=>{                                    // Check if we're halted, and because we're on a timout,
                if (!this.halted && runID === this.updateCount  //   check if we've started a new drawing process
                    && !(this.comparisonOn                          // Check if we're in comparison mode, and if so, check
                    && this.map[node].getState() == nodeState.Path2 //   if there's a path already drawn here
                    && state == nodeState.Visited1))
                    this.map[node].setState(state);         // If all of these conditions are satifcatory, draw the node
            }, timing);
        }
        if (this.autoOn) {                                  // If we're in auto mode,
            timing += autoResetSpeed;                       //   wait for the auto reset period,
            setTimeout(()=>{
                if (!this.comparisonOn && !this.halted &&   //   and comparison mode is off and we're still
                    runID === this.updateCount)             //   drawing this process, clear the visualizer
                    this.clear();
            }, timing);
        }
        for (let i = 0; i < this.aDraw.length; i += 2) {    // Repeat the same draw process as dijkstra for A*
            if ((this.mode === visMode.Dijkstra 
                && !this.autoOn) || this.halted) 
                break;
            let node = this.aDraw[i];
            let state = this.aDraw[i+1];
            timing += (state === nodeState.Path2) ? pathAnimationSpeed :
                                                    visitAnimationSpeed;
            setTimeout(()=>{
                if (!this.halted && runID === this.updateCount
                    && !(this.comparisonOn 
                    && this.map[node].getState() == nodeState.Path1 
                    && state == nodeState.Visited2))
                    this.map[node].setState(state);
            }, timing);
        }
        setTimeout(()=>{                                    // If we're still in the same draw process,
            if (runID === this.updateCount)                 //   indicate that we're done drawing after
                this.isDrawing = false;                     //   the reset timer
        }, timing+autoResetSpeed);
    }
    public run() {                                          // Run dijkstra/bfs and a*, store the result
        console.clear();                                    // Clear the visualizer
        this.isRunning = true;                              // Indicate that we're running, resets after render
        if (this.halted) this.halted = false;               // Reset our halt indicator
        let run = new PathFind;                             // Run and store our pathfinding results
        this.result = run;
        run.update(this.map, this.startNode, this.endNode);
        this.updateCount++;                                 // Iterate our update counter
        let pathDiff = this.result.dijkstraPath.length - this.result.aStarPath.length;      // Calculate the difference in
        let visitDiff = this.result.dijkstraVisit.length - this.result.aStarVisit.length;   // our bfs/a* result this run
        this.totalPathDiff += pathDiff;                     // Calculate our average difference between all runs
        this.totalVisitDiff += visitDiff;
        let avgPath = this.totalPathDiff / this.updateCount;
        let avgVisit = this.totalVisitDiff / this.updateCount;
            console.log("difference: " + pathDiff + " " + visitDiff);   // Output the differences and averages in the console
            console.log("average: " + avgPath + " " + avgVisit);
        this.render();                                      // Render our results
        if (this.autoOn)                                    // Auto logic
            this.auto();
    }
    private render() {                                      // Prepare our results for drawing
        console.log("rendering result");                    // Indicate that we're rendering in the console
        let draw = new Array<number>();
        for (const node of this.result.dijkstraVisit) {     // Render Visited tiles
            draw.push(node);                                //   1. Store our target nodes in the first slot
            draw.push(nodeState.Visited1);                  //   2. Store our target states in the second slot
        }
        if (!this.result.dijkstraPath.length) {             // If there is no path, render Unsolvable tiles
            for (const node of this.result.dijkstraVisit) {
                draw.push(node);
                draw.push(nodeState.Unsolvable);
            }
        }
        else {
            for (const node of this.result.dijkstraPath) {  // Render Path tiles
                draw.push(node);
                draw.push(nodeState.Path1);
            }
        }
        this.dDraw = draw;                                 // Store it!
        draw = new Array<number>();                        // Do it all again for A*
        for (const node of this.result.aStarVisit) {
            draw.push(node);
            draw.push(nodeState.Visited2);
        }
        if (!this.result.aStarPath.length) {
            for (const node of this.result.aStarVisit) {
                draw.push(node);
                draw.push(nodeState.Unsolvable);
            }
        }
        else {
            for (const node of this.result.aStarPath) {
                draw.push(node);
                draw.push(nodeState.Path2);
            }
        }
        this.aDraw = draw;
        this.isRunning = false;                             // Indicate we're done running
        if (this.autoOn) this.draw();                       // Auto logic
    }
}

// Pathfinding Algorithms and Components: ////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class PathNode {                                            // Nodes for running pathfinding algorithms
    public id:number;
    public distance:number = Infinity;                      // Initialize cost/distance as Infinity so values with an
    public cost:number = Infinity;                          //   assigned cost/distance get pushed to front during sort
    public isObstacle:Boolean = false;
    public isVisited:Boolean = false;
    public previous:PathNode = null;                        // Initialize previous nodes as null
}

class PathFind {                                            // Object that finds the shortest path for a given map
    private dijkstraPath = new Array<number>();             // Store each algorithm's visited nodes
    private dijkstraVisit = new Array<number>();            //   and paths seperate arrays
    private aStarPath = new Array<number>();
    private aStarVisit = new Array<number>();
    private grid = new Array<PathNode>();                   // Visualizer's map, converted from visNodes to PathNodes
    private end = null;                                     // Keep track of our end node
    private dijkstraDone:Boolean = false;                   // True while dijkstra's is running
    public getDijkstraPath() { return this.dijkstraPath; }  // Pass our paths and visited tiles to the visualizer
    public getDijkstraVisit() { return this.dijkstraVisit; }
    public getAStarPath() { return this.aStarPath; }
    public getAStarVisit() { return this.aStarVisit; }
    public update(map:Array<visNode>, startNode:number, endNode:number) {   // Run the algorithms and store the results
        console.log("calculating paths...");
        let convNodeID = 0;                                 // Convert each visNode to a PathNode and store it in the grid
        for (const node of map) {
            let convNode = new PathNode;
            let state = node.getState();
            if (state === nodeState.Obstacle) convNode.isObstacle = true;
            else if (state === nodeState.Start) { 
                convNode.distance = 0;
                convNode.cost = 0;
            }
            convNode.id = convNodeID;
            convNodeID++;
            this.grid.push(convNode);
        }
        this.end = this.grid[endNode];                      // Store our end node
        this.dijkstra();                                    // Run dijkstra
        this.runNext();                                     // Run A* when dijkstra is done
    }
    private runNext() {                                     // Wait for dijkstra
        if (this.dijkstraDone) {                            // Check if dijkstra is done
            this.reset();                                   // Reset and run A* when it finishes
            this.aStar();
        }
        else setTimeout(() => {this.runNext();}, 500);      // Otherwise, check again in 500ms
    }

    public dijkstra() {                                     // Pathfinding based on distance from the start node. In this
                                                            //   context, Dijkstra's and bfs are the same implementation.
        const unvisitedNodes = this.getAllNodes();          // Create an array to store our unvisited nodes
        while (!!unvisitedNodes.length) {                   // While there are nodes to visit...
            this.sortNodesByDistance(unvisitedNodes);       //   1. Sort our nodes by their distance from the start
            const closestNode = unvisitedNodes.shift();     //   2. Find the closest node and remove it from the array
            console.log("bfs analyzing " + closestNode.id); //   3. Output which node we're visiting in the console
            if (closestNode.isObstacle) continue;           //   4. Ignore this node if it's an obstacle
            if (closestNode.distance === Infinity) {        //   5. Check if we're stuck (closest node's distance = Infinity)
                this.dijkstraDone = true;                   //      5.1. Indicate we've finished
                break;                                      //      5.2. Exit
            }
            closestNode.isVisited = true;                   //   6. Indicate we've visited this node
            this.dijkstraVisit.push(closestNode.id);        //   7. Push the node's id to our array of visited nodes
            if (closestNode === this.end) {                 //   8. Check if we've reached the end
                this.drawDijkstraPath(this.end);            //      8.1. Find our path
                break;                                      //      8.2. Exit
            }
            this.updateUnvisitedNeighbors(closestNode, false);// 9. Update the nodes adjacent to our current node
        }
        this.dijkstraVisit.shift();                         //  10. Remove the start and end nodes from our results
        this.dijkstraVisit.pop();
    }
    public aStar() {                                        // Pathfinding based on the cost to visit nodes. Cost is the sum
                                                            //   of the distance from the start node and a weighted heuristic.
                                                            //   The weight of the heuristic can be set by the user, and is
                                                            //   based on the estimated distance from the end node.
        const unvisitedNodes = this.getAllNodes();          //   Same as dijkstra, but one minor difference...
        while (!!unvisitedNodes.length) {
            this.sortNodesByCost(unvisitedNodes);           // Use cost instead of distance
            const closestNode = unvisitedNodes.shift();
            console.log("a* analyzing " + closestNode.id);
            if (closestNode.isObstacle) continue;
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
    }

    private sortNodesByDistance(unvisitedNodes) {           // Sort nodes by distance
        unvisitedNodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
    }
    private sortNodesByCost(unvisitedNodes) {               // Sort nodes by cost
        unvisitedNodes.sort((nodeA, nodeB) => nodeA.cost - nodeB.cost);
    }
    private updateUnvisitedNeighbors(node:PathNode, useHeuristics:boolean) {    // Update the nodes adjacent to our given node
        const unvisitedNeighbors = this.getNeighbors(node); // Get our unvisited neighbors
        for (const neighbor of unvisitedNeighbors) { 
            neighbor.distance = node.distance+1;            // Each unvisited neighbor is another node away from the start
            if (useHeuristics) {                            // If we're using A*, calculate the heuristic
                let estimatedDistance = this.estimateDistance(neighbor.id); 
                let heuristic = (heuristicIsExponent) ? Math.pow(estimatedDistance, heuristicWeight) :
                                estimatedDistance * heuristicWeight;
                                                            // If we're using exponential weighting, our heuristic is the
                                                            //   estimated distance from the end node raised to the power of
                                                            //   our weight. Otherwise, it's the product of the two.
                neighbor.cost = heuristic + neighbor.distance;  // Our cost is the sum of our heuristic and
                                                                //   our distance from the start node
            }
            neighbor.previous = node;
        }
    }
    private getAllNodes() {                                 // Return an array of all nodes in the grid
        const nodes = [];
        for (const node of this.grid)
            nodes.push(node);
        return nodes;
    }
    private drawDijkstraPath(end:PathNode) {                // Use our results from Dijkstra's to find our path
        let currentNode = end;                              // Start at the end node
        while (currentNode !== null) {                      // Only the start node has a .previous value of null, so
                                                            //   until we reach the start node...
            this.dijkstraPath.unshift(currentNode.id);      //   1. Add this node to the start of our path array
            currentNode = currentNode.previous;             //   2. Move to this node's previous node
        }
        this.dijkstraPath.shift();                          // Remove the start and end nodes from our result
        this.dijkstraPath.pop();
        this.dijkstraDone = true;                           // Indicate that dijkstra's has finished running
        console.log("dijkstra: " + this.dijkstraPath.length + " " + this.dijkstraVisit.length);
                                                            // Output how many nodes we visited and the length of our path
    }
    private drawAStarPath(end:PathNode) {                   // Use our results from A* to find our path
        let currentNode = end;                              // Implementation mirrors drawDijkstraPath, with two differences:
        while (currentNode !== null) {
            this.aStarPath.unshift(currentNode.id);         //   1. We store to a different array
            currentNode = currentNode.previous;
        }
        this.aStarPath.shift();
        this.aStarPath.pop();                               //   2. No need to indicate when we're done
        console.log("astar: " + this.aStarPath.length + " " + this.aStarVisit.length);
    }
    private estimateDistance(node) {                        // Return the estimated distance between the given node
        let end = this.end.id;                              //   and the end node
        let endX = end % rowSize;                           // Use modulus to identify our x values
        let nodeX = node % rowSize;
        let endY = (end - endX) / rowSize;                  // Subtract our x value, then use division to find our
        let nodeY = (node - nodeX) / rowSize;               //   y values
        return Math.abs(nodeX - endX) + Math.abs(nodeY - endY); // Use these values to return the difference
                                                                //   between their coordinates
    }

    private getNeighbors(targetNode:PathNode) {             // Return an array of the unvisited nodes adjacent to the target
        let neighbors = new Array<PathNode>;
        let target = targetNode.id;
        if (target-1 >= 0 &&                                // Check if the left adjacent node is in bounds
            target%rowSize !== 0
            && this.grid[target-1].isVisited == false)      // Check if the left node is visited
            neighbors.push(this.grid[target-1]);            // Push it to our return array if these conditions are satisfied
        if (target+1 >= 0                                   // Repeat for right adjacent node
            && (target+1)%rowSize !== 0 
            && this.grid[target+1].isVisited == false)
            neighbors.push(this.grid[target+1]);
        if (target-rowSize >= 0 &&                          // Repeat for top adjacent node (requires one fewer bounds check)
            this.grid[target-rowSize].isVisited == false)
            neighbors.push(this.grid[target-rowSize]);
        if (target+rowSize < visSize                        // Repeat for bottom adjacent node (also requires one less check)
            && this.grid[target+rowSize].isVisited == false)
            neighbors.push(this.grid[target+rowSize]);
        return neighbors;
    }
    public reset() {                                        // Reset the values of each node in the grid
        for (const node of this.grid) {
            if (node.distance !== 0)
                node.distance = Infinity;
            node.isVisited = false;
            node.previous = null;
        }
    }
}

// Controls:                               ///////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function start() {                                          // Run the pathfinding calculation or auto mode if set
    visualizer.clear();
    if (visualizer.autoOn)
        generate();
    visualizer.run();
}
function halt() {                                           // Send a halt signal to the visualizer
    visualizer.autoOn = false;
    visualizer.stop();
}
function auto() {                                           // Set auto mode
    let autoCheckbox = document.querySelector('#auto');     // Set based on whether the checkbox is checked
    visualizer.autoOn = (autoCheckbox as HTMLInputElement).checked;
}
function comparisons() {                                    // Set comparison mode
    let comparisonCheckbox = document.querySelector('#compare');    // Set based on whether the checkbox is checked
    visualizer.comparisonOn = (comparisonCheckbox as HTMLInputElement).checked;
}
function dijkstra() {                                       // Draw dijkstra's based on run result
    if (!visualizer.comparisonOn)
        visualizer.clear();
    visualizer.mode = visMode.Dijkstra;
    visualizer.draw();
}
function aStar() {                                          // Draw A* based on run result
    if (!visualizer.comparisonOn)
        visualizer.clear();
    visualizer.mode = visMode.AStar;
    visualizer.draw();
}
function set() {                                            // Set the start and end nodes
    visualizer.inputMode = nodeState.Start;
}
function generate() {                                       // Generate a randomized map
    visualizer.generateTest();
}
function resetVis() {                                       // Reinitialize the visualizer
    newVis(rowSize);
}
function clearVis() {                                       // Clear visited tiles and paths from the visualizer
    visualizer.clear();
}
function setSpeed(speed:number) {                           // Set the speed of the visualizer's animations
    const crawl = 0;
    const slow = 1;
    const normal = 2;
    const fast = 3;
    (speed == crawl) ? (visitAnimationSpeed=100, pathAnimationSpeed=200) :
    (speed == slow) ? (visitAnimationSpeed=50, pathAnimationSpeed=100) :
    (speed == normal) ? (visitAnimationSpeed=10, pathAnimationSpeed=20) :
    (speed == fast) ? (visitAnimationSpeed=1, pathAnimationSpeed=20) :
    (visitAnimationSpeed=0, pathAnimationSpeed=0);
}
function newVis(newSize:number) {                           // Set the size of the visualizer
    visualizer.div.parentElement.removeChild(visualizer.div);   // Delete the existing visualizer from the DOM
    if (newSize > 200)                                      // Warn users about running a visualizer with 0.25 million nodes
        alert("Running the visualizer on this setting make take a while.");

    let containerSize = '500px';                            // Change CSS values to accomodate changing numbers of nodes
    let nodeSize = '20%';
    let buttonSize = '10pt';
    if (newSize == 10) {
        nodeSize = '10%';
    }
    else if (newSize == 50) {
        nodeSize = '2%';
    }
    else if (newSize == 100) {
        nodeSize = '1%'
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

    rowSize = newSize;                                      // Create a new visualizer with these new variables
    visSize = rowSize*rowSize;
    let root = document.querySelector(':root');
    (root as HTMLElement).style.setProperty('--nodeSize', nodeSize);
    (root as HTMLElement).style.setProperty('--containerSize', containerSize);
    (root as HTMLElement).style.setProperty('--buttonSize', buttonSize);
    visualizer = new Visualizer;
    auto();                                                 // Make sure our settings still match our checkboxes
    comparisons();
}

function heuristicStrength(weight:number) {                 // Set the weight of our heuristic
    if (weight < 4) {
        heuristicIsExponent = false;
        if (weight == 3) weight++;
        heuristicWeight = weight;
    }
    else {
        heuristicIsExponent = true;
        heuristicWeight = 2;
    }
}

// Runtime:                                ///////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let visualizer = new Visualizer;                            // Start the visualizer