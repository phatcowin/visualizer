// Visualizer Components and Properties:

let rowSize = 100;                                         // Adjust the map size with rowSize
let visSize = rowSize * rowSize;                          // Map size = rowSize^2

enum nodeState {                                            // Create an enum to reference our node states
    Unvisited,
    Visited,
    Obstacle,
    Start,
    End,
    Path,
}

enum visMode {
    None,
    Auto,
    Dijkstra,
}

class visNode {
    private state:nodeState = nodeState.Unvisited;         
    private div = document.createElement('div');
    private distance:number = Infinity;
    private previousNode:number = null;
    private nodeID:number = null;
    constructor(visNodeID) {                                // Initialize visNode: 
        this.nodeID = visNodeID;                            //      Assign a nodeID to the class
        this.div.setAttribute('visNodeID', visNodeID);      //      Assign an ID to the div
        this.div.className = "vis-node";                    //      Assign the vis-node class to the div
        //this.div.innerHTML = visNodeID;
        let visContainer = document.getElementById('vis-container'); 
        if (visContainer)                                   //      Make sure the container exists for the div
            visContainer.appendChild(this.div);             //      Place the div in the container
        else 
            console.log("Error::visualizer.ts: visNode cannot be constructed without a visContainer");

                                                            // Make each visNode interactive
        this.div.addEventListener("click", (ev: MouseEvent) => {
            let element = ev.target as HTMLElement;         // Use the visNodeID attribute to target nodes
            let targetNode:number = parseInt(element.getAttribute('visNodeID')); 
            visualizer.toggle(targetNode);
        });
    }
    public getState() { return this.state; }
    public setState(newState:nodeState) {                  // When we set the node state, update the div color
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
    }
    public setDistance(newDist:number) {
        this.distance = newDist;
    }
    public getDistance() {
        return this.distance;
    }
    public setPreviousNode(newNode:number) {
        this.previousNode = newNode;
        this.div.setAttribute("previous-node", ""+newNode);
    }
    public getPreviousNode() {
        return this.previousNode;
    }
    public getNodeNumber() {
        return this.nodeID;
    }
}

class Visualizer {
    private map = new Array<visNode>();                     // Create our map
    private div = document.createElement('div');            // Create a container for our visualizer
    private startNode:number = -1;                          // Keep track of our start and end nodes
    private endNode:number = -1;
    private mode:visMode = visMode.Dijkstra;                    // Run mode (Dijkstra's, Auto, etc)
    private isRunning:boolean = false;                      // Run switch
    private inputMode:nodeState = nodeState.Obstacle;       // When a user clicks, what are they trying to place?

    constructor() {
        document.body.appendChild(this.div);
        this.div.className = 'map-container';
        this.div.setAttribute('id', 'vis-container');
        for (let i = 0; i < visSize; i++) {                 // Use the constructor to create visSize
            let newNode = new visNode(i);                   // many visNodes and push them to our map
            this.map.push(newNode);
        }
    }
    private setNode(targetNode:number, value:nodeState) {   // Set the status of a given node
        if (value === nodeState.Start) {                    // Only allow one start node
            if (this.startNode !== -1) {
                this.map[this.startNode].setState(nodeState.Unvisited);
                this.map[this.startNode].setDistance(Infinity);
            }
            this.startNode = targetNode;
            this.map[targetNode].setDistance(0);
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

        // Future Dalton: log all states and sets for slider!
    }
    private getNode(targetNode:number) {
        return this.map[targetNode].getState();
    }
    private generate10xTest() {
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
    }
    private generate5xTest() {
        this.reset();
        this.setNode(0, nodeState.Start);
        this.setNode(24, nodeState.End);
        this.setNode(11, nodeState.Obstacle);
        this.setNode(12, nodeState.Obstacle);
        this.setNode(13, nodeState.Obstacle);
    }
    private generateRandomTest() {
        this.reset();
        let start = Math.floor(Math.random() * visSize);
        let end = visSize - Math.floor(Math.random() * visSize);
        for (let i = 0; i < rowSize*4; i++)
            this.setNode(Math.floor(Math.random() * visSize), nodeState.Obstacle);
        this.setNode(start, nodeState.Start);
        this.setNode(end, nodeState.End);
    }
    private generateTest() {
        if (rowSize === 5)
            this.generate5xTest();
        else if (rowSize === 10)
            this.generate10xTest();
        else 
            this.generateRandomTest();
    }

    public clear() {                                        // Reset any visited/path nodes, step log
        for (let i = 0; i < visSize; i++) {                 // Use between different runs on the same map
            if (this.map[i].getState() === nodeState.Visited
                || this.map[i].getState() === nodeState.Path) {
                this.map[i].setState(nodeState.Unvisited);
            }
        }
        // Future Dalton: reset step log!
    }
    public reset() {                                        // Create a fresh board, reset step log
        for (let i = 0; i < visSize; i++) {
            this.map[i].setState(nodeState.Unvisited);
        }

        // Future Dalton: reset step log!
    }
    public place(newInputMode:nodeState) {                  // What kind of node are we setting?
        this.inputMode = newInputMode;
    }
    public toggle(targetNode:number) {                      // Toggle nodes from user input
        if (this.isRunning) {}                              // Don't toggle nodes while an algorithm is running
        else if (this.inputMode === nodeState.Obstacle) 
            this.setNode(targetNode, nodeState.Obstacle);
        else if (this.inputMode === nodeState.Start) 
            this.setNode(targetNode, nodeState.Start);
        else if (this.inputMode === nodeState.End)
            this.setNode(targetNode, nodeState.End);

    }
    public setMode(newMode:visMode) {
        this.mode = newMode;
    }
    public run() {                                          // Start pathfinding with the specified mode
        this.isRunning = false;
        if (this.mode === visMode.Auto) {
            this.generate10xTest();
            setTimeout(() => {
                this.run();
            }, 500);
        }

        else if (this.mode === visMode.Dijkstra) {
            this.generateRandomTest();
            setTimeout(() => {
                dijkstra(this.map, this.startNode, this.endNode);
            }, 0);
        }
    }
    public stop() {                                         // Used to stop Auto Mode
        this.isRunning = false;
    }

    public sandbox() {
        let testVal:number = -1;
        this.setNode(testVal, nodeState.Start);
        let testArray = getUnvisitedNeighbors(testVal, this.map);
        for (const neighbor of testArray) {
            this.map[neighbor].setState(nodeState.Path);
            console.log(neighbor);
        }
    }
}

function generateRandomMap() {
    visualizer.reset();
    let startNode = Math.floor(Math.random() * visSize);
    let endNode = Math.floor(Math.random() * visSize);
    let obstacle = Math.floor(Math.random() * visSize);
    while (startNode === endNode)
        endNode = Math.floor(Math.random() * visSize);
    visualizer.place(nodeState.Start);
    visualizer.toggle(startNode);
    visualizer.place(nodeState.End);
    visualizer.toggle(endNode);
    visualizer.place(nodeState.Obstacle);
    for (let i = 0; i < 2*rowSize; i++) {
        visualizer.toggle(obstacle);
        obstacle = Math.floor(Math.random() * visSize);
    }
}
let visualizer = new Visualizer;                            // Start the visualizer
visualizer.run();


// Pathfinding Algorithms and Components: 

function dijkstra(map:Array<visNode>, startNode:number, endNode:number) {
    let unvisitedNodes = new Array<number>;
    for (let i = 0; i < visSize; i++)
        unvisitedNodes.push(i);

    let loopCount:number = 0;
    while (!!unvisitedNodes.length) {
        loopCount++;
        sortNodesByDistance(unvisitedNodes, map);
        const closestNode = unvisitedNodes.shift();
        //console.log("Loop count: " + loopCount + " closest node: " + closestNode);
        if (map[closestNode].getState() === nodeState.Obstacle) continue;    // Obstacle detection
        if (map[closestNode].getDistance() === Infinity) break;              // Trap detection
        if (map[closestNode].getState() !== nodeState.Start
            && map[closestNode].getState() !== nodeState.End)
            setTimeout(() => {
                map[closestNode].setState(nodeState.Visited);                // Mark node visited
            }, loopCount*1);
        if (closestNode === endNode) {
            console.log("Reached end node. " + endNode + " " + closestNode);
            console.log("Dijkstra complete: drawing path from " + endNode);
            setTimeout(() => {
                drawPath(startNode, endNode, map);
            }, loopCount*1 + 100);
            break;
        }
        updateUnvisitedNeighbors(closestNode, map);
    }
    
    visualizer.stop();
}

function sortNodesByDistance(unvisitedNodes:Array<number>, map:Array<visNode>) {
    unvisitedNodes.sort((nodeA, nodeB) => map[nodeA].getDistance() - map[nodeB].getDistance());
    return unvisitedNodes;
}

function updateUnvisitedNeighbors(targetNode:number, map:Array<visNode>) {
    const unvisitedNeighbors:Array<number> = getUnvisitedNeighbors(targetNode, map);
    for (const neighbor of unvisitedNeighbors) {
        //console.log("update neighbors: " + targetNode + " neighbor " + neighbor);
        map[neighbor].setDistance(map[targetNode].getDistance() + 1);
        if (map[neighbor].getPreviousNode() === null)
            map[neighbor].setPreviousNode(targetNode);
    }
}

function getUnvisitedNeighbors(targetNode:number, map:Array<visNode>) {
    const neighbors = new Array<number>;
    if (targetNode - 1 >= 0 && targetNode % rowSize !== 0) {                // Check left
        if (map[targetNode - 1].getState() !== nodeState.Visited) 
            neighbors.push(targetNode - 1);
    }
    if (targetNode + 1 >= 0 && (targetNode + 1) % rowSize !== 0) {          // Check right
        if (map[targetNode + 1].getState() !== nodeState.Visited)
            neighbors.push(targetNode + 1);
    }
    if (targetNode - rowSize >= 0) {                                        // Check top
        if (map[targetNode - rowSize].getState() !== nodeState.Visited)
            neighbors.push(targetNode - rowSize);
    }
    if (targetNode + rowSize < visSize) {                                        // Check bottom
        if (map[targetNode + rowSize].getState() !== nodeState.Visited)
            neighbors.push(targetNode + rowSize);
    }
    return neighbors;
}

function drawPath(startNode:number, endNode:number, map:Array<visNode>) {
    const path = [];
    let currentNode:number = endNode;
    let loopCount:number = 0;
    while (currentNode !== startNode && loopCount < 1000) {
        console.log("unshifting " + currentNode);
        path.unshift(currentNode);
        currentNode = map[currentNode].getPreviousNode();
    }
    for (const node of path) {
        loopCount++;
        if (map[node].getState() !== nodeState.Start
            && map[node].getState() !== nodeState.End)
        setTimeout(() => {
            map[node].setState(nodeState.Path);
        }, loopCount*10);
    }
}