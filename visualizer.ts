// Config:                               //////////////////////////////////////////////////////////////////////////
let rowSize = 50;                                           // Adjust the map size with rowSize
let visSize = rowSize * rowSize;                            // Map size = rowSize^2
let visitAnimationSpeed = 1;
let pathAnimationSpeed = 20;
let autoResetSpeed = 1000;
let pathfindSpeed = 5000;                                  // How long does pathfinding take???
let showNodeNumber = false;

// Visualizer Components and Properties: //////////////////////////////////////////////////////////////////////////
enum nodeState {                                            // Create an enum to reference our node states
    Unvisited,
    Visited,
    Obstacle,
    Start,
    End,
    Path,
    Unsolvable,
}

enum visMode {
    None,
    Auto,
    Dijkstra,
}

class visNode {
    private state:nodeState = nodeState.Unvisited;         
    private div = document.createElement('div');
    private previousNode:number = null;
    private nodeID:number = null;
    constructor(visNodeID) {                                // Initialize visNode: 
        this.nodeID = visNodeID;                            //      Assign a nodeID to the class
        this.div.setAttribute('visNodeID', visNodeID);      //      Assign an ID to the div
        this.div.className = "vis-node";                    //      Assign the vis-node class to the div
        if (showNodeNumber) this.div.innerHTML = visNodeID;
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
        else if (newState === nodeState.Unsolvable)
            this.div.style.backgroundColor = 'var(--unsolvable)';
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
    public map = new Array<visNode>();                     // Create our map
    private div = document.createElement('div');            // Create a container for our visualizer
    public startNode:number = -1;                          // Keep track of our start and end nodes
    public endNode:number = -1;
    private mode:visMode = visMode.Dijkstra;                    // Run mode (Dijkstra's, Auto, etc)
    private isRunning:boolean = false;                      // Run switch
    private inputMode:nodeState = nodeState.Obstacle;       // When a user clicks, what are they trying to place?
    private result:any;
    private autoTimeout:number = 1;

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
        let end = Math.floor(Math.random() * visSize);
        while (start === end)
            end = Math.floor(Math.random() * visSize);
        for (let i = 0; i < visSize/2.5; i++)
            this.setNode(Math.floor(Math.random() * visSize), nodeState.Obstacle);
        this.setNode(start, nodeState.Start);
        this.setNode(end, nodeState.End);
    }

    public generateTest() {
        if (rowSize === 5)
            this.generate5xTest();
        else if (rowSize === 10)
            this.generateRandomTest();
        else 
            this.generateRandomTest();
    }
    public clear() {                                        // Reset any visited/path nodes, step log
        for (let i = 0; i < visSize; i++) {                 // Use between different runs on the same map
            if (this.map[i].getState() === nodeState.Visited
                || this.map[i].getState() === nodeState.Path
                || this.map[i].getState() === nodeState.Unsolvable) {
                this.map[i].setState(nodeState.Unvisited);
            }
        }
    }
    public reset() {                                        // Create a fresh board, reset step log
        for (let i = 0; i < visSize; i++) {
            this.map[i].setState(nodeState.Unvisited);
        }
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
    public stop() {                                         // Used to stop Auto Mode
        this.isRunning = false;
    }
    public auto() {
        if (!this.isRunning) {
            this.isRunning = true;
            visualizer.reset();
            visualizer.generateTest();
            setTimeout(() => {visualizer.run();},0);        // Crashes without the timeout 
            this.auto();
            this.autoTimeout++;
        }
        if (this.isRunning) {
            setTimeout(() => { this.auto(); }, 500);
        }
    }

    private draw(visited:Array<number>, path:Array<number>) {
        let visitTiming:number = 0;
        let pathTiming:number = 0;
        for (const node of visited) {
            setTimeout(() => {
                if (node !== this.startNode && node !== this.endNode)
                    this.map[node].setState(nodeState.Visited);
            }, visitTiming);
            visitTiming += visitAnimationSpeed;
        }
        if (path.length < 1) {
            
            setTimeout(() => {
                for (const node of visited) {
                    if (node !== this.startNode && node !== this.endNode)
                    this.map[node].setState(nodeState.Unsolvable);
                }
            }, visitTiming);
        }
        else {
            for (const node of path) {
                setTimeout(() => {
                    if (node !== this.startNode && node !== this.endNode)
                        this.map[node].setState(nodeState.Path);
                }, visitTiming + pathTiming);
                pathTiming += pathAnimationSpeed;
            }
        }
        setTimeout(() => { this.isRunning = false; }, pathTiming + visitTiming + autoResetSpeed);
    }
    public run() {
        this.isRunning = true;
        let run = new PathFind;
        this.result = run;
        run.update(this.map, this.startNode, this.endNode);
        this.result.dijkstra();
        this.render();
    }
    public render() {
        if (this.result.isDone())
            this.draw(this.result.getDijkstraVisit(), this.result.getDijkstraPath());
        else 
            this.renderTimeout(0);
        delete this.result;
    }
    private renderTimeout(count) {
        console.log("result not done");
        if (this.result.isDone())
            this.render();
        else if (count > 20)
            console.log("timeout: render failed");
        else {
            setTimeout(() => {
                this.renderTimeout(count+1);
            }, 500);
        }
    }
    public testRender() {
        this.draw(testDraw(), testDraw());
    }
    
}

let visualizer = new Visualizer;                            // Start the visualizer
visualizer.auto();

function testDraw() {
    let path = new Array;
    for (let i = 0; i < 10; i++)
        path.push(i+10);
    return path;
}

// Pathfinding Algorithms and Components: ////////////////////////////////////////////////////////////////////////
class PathNode {
    public id:number;
    public distance:number = Infinity;
    public isObstacle:Boolean = false;
    public isVisited:Boolean = false;
    public previous:PathNode = null;
}

class PathFind {
    private dijkstraPath = new Array<number>();
    private dijkstraVisit = new Array<number>();
    private grid = new Array<PathNode>();
    private start = null;
    private end = null;
    private done:Boolean = false;
    public getDijkstraPath() { return this.dijkstraPath; }
    public getDijkstraVisit() { return this.dijkstraVisit; }
    public isDone() { return this.done; }
    public update(map:Array<visNode>, startNode:number, endNode:number) {
        let convNodeID = 0;
        for (const node of map) {
            let convNode = new PathNode;
            let state = node.getState();
            if (state === nodeState.Obstacle) convNode.isObstacle = true;
            else if (state === nodeState.Start) convNode.distance = 0;
            convNode.id = convNodeID;
            convNodeID++;
            this.grid.push(convNode);
        }
        this.start = this.grid[startNode];
        this.end = this.grid[endNode];
    }

    public dijkstra() {
        const visitedNodesInOrder = [];
        const unvisitedNodes = this.getAllNodes();
        while (!!unvisitedNodes.length) {
            this.sortNodesByDistance(unvisitedNodes);
            const closestNode = unvisitedNodes.shift();
            if (closestNode.isObstacle) continue;
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
    }
    private sortNodesByDistance(unvisitedNodes) {
        unvisitedNodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
    }
    private updateUnvisitedNeighbors(node) {
        const unvisitedNeighbors = this.getNeighbors(node);
        for (const neighbor of unvisitedNeighbors) {
            neighbor.distance = node.distance +1;
            neighbor.previous = node;
        }
    }
    private getAllNodes() {
        const nodes = [];
        for (const node of this.grid)
            nodes.push(node);
        return nodes;
    }
    private drawDijkstraPath(end) {
        const nodesInShortestPathOrder = [];
        let currentNode = end;
        while (currentNode !== null) {
            nodesInShortestPathOrder.unshift(currentNode);
            currentNode = currentNode.previous;
        }
        for (const node of nodesInShortestPathOrder)
            this.dijkstraPath.push(node.id);
        this.done = true;
    }


    private getNeighbors(targetNode:PathNode) {
        let neighbors = new Array<PathNode>;
        let target = targetNode.id;
        if (target-1 >= 0 && target%rowSize !== 0 && this.grid[target-1].isVisited == false)     // left
            neighbors.push(this.grid[target-1]);
        if (target+1 >= 0 && (target+1)%rowSize !== 0 && this.grid[target+1].isVisited == false) // right
            neighbors.push(this.grid[target+1]);
        if (target-rowSize >= 0 && this.grid[target-rowSize].isVisited == false)                 // top
            neighbors.push(this.grid[target-rowSize]);
        if (target+rowSize < visSize && this.grid[target+rowSize].isVisited == false)            // bottom
            neighbors.push(this.grid[target+rowSize]);
        return neighbors;
    }
    public reset() {
        for (const node of this.grid) {
            if (node.distance !== 0)
                node.distance = Infinity;
            node.isVisited = false;
            node.previous = null;
        }
    }
}