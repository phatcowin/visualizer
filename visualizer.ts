// Config:                               //////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let rowSize:number = 50;                                    // Adjust the map size with rowSize
let visSize:number = rowSize * rowSize;                     // Map size = rowSize^2
let visitAnimationSpeed:number = 1;
let pathAnimationSpeed:number = 20;
let autoResetSpeed:number = 1000;
let heuristicWeight:number = 1;                             // Set the weight for A*'s heuristic component
let heuristicIsExponent:boolean = true;
let showNodeNumber:boolean = false;

// Visualizer Components and Properties: /////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
enum nodeState {                                            // Create an enum to reference our node states
    Unvisited,
    Visited1,
    Visited2,
    Obstacle,
    Start,
    End,
    Path1,
    Path2,
    Unsolvable,
}

enum visMode {
    Dijkstra,
    AStar,
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
    }
    public getNodeNumber() { return this.nodeID; }
}

class Visualizer {
    public map = new Array<visNode>();                     // Create our map
    public div = document.createElement('div');            // Create a container for our visualizer
    public startNode:number = -1;                          // Keep track of our start and end nodes
    public endNode:number = -1;
    private mode:visMode = visMode.Dijkstra;                // Run mode (Dijkstra's, Auto, etc)
    private isRunning:boolean = false;                      // Run switch
    private isDrawing:boolean = false;
    public autoOn:boolean = false;
    public comparisonOn:boolean = false;
    private halted:boolean = false;
    private inputMode:nodeState = nodeState.Obstacle;       // When a user clicks, what are they trying to place?
    public result:any;
    private current:number = 0;
    private autoTimeout:number = 1;
    private totalPathDiff:number = 0;
    private totalVisitDiff:number = 0;
    private updateCount:number = 0;
    private dDraw = new Array<number>();
    private dUndraw = new Array<number>();
    private aDraw = new Array<number>();
    private aUndraw = new Array<number>();

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
    private getNode(targetNode:number) { return this.map[targetNode].getState(); }
    public generateTest() {
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
    public generateMaze() {
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
    public reset() {                                        // Create a fresh board, reset step log
        for (const node of this.map)
            node.setState(nodeState.Unvisited);
    }
    public clear() {
        for (const node of this.map) {
            let state = node.getState();
            if (state !== nodeState.Start &&
                state !== nodeState.End &&
                state !== nodeState.Obstacle)
                node.setState(nodeState.Unvisited);
        }
    }
    public place(newInputMode:nodeState) {                  // What kind of node are we setting?
        this.inputMode = newInputMode;
    }
    public toggle(targetNode:number) {                      // Toggle nodes from user input
        if (this.isRunning) return;                         // Don't toggle nodes while an algorithm is running
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
    }
    public setMode(newMode:visMode) {
        this.mode = newMode;
    }
    public stop() {                                         // Used to stop Auto Mode
        this.isRunning = false;
        this.halted = true;
    }
    public auto() {
        if (this.halted) return;
        if (!this.isRunning && !this.isDrawing) {
            this.isRunning = true;
            visualizer.reset();                             // Create a fresh maze
            visualizer.generateTest();
            setTimeout(() => {visualizer.run();},0);        // Crashes without the timeout for some reason
        }
        else 
            setTimeout(() => { this.auto(); }, 500);
    }

    public draw() {
        this.isDrawing = true;
        let runID = this.updateCount;
        let timing = 0;
        for (let i = 0; i < this.dDraw.length; i += 2) {
            if ((this.mode === visMode.AStar && !this.autoOn) || this.halted) break;
            let node = this.dDraw[i];
            let state = this.dDraw[i+1];
            timing += (state === nodeState.Path1) ? pathAnimationSpeed :
                                                    visitAnimationSpeed;
            setTimeout(()=>{
                if (!this.halted && runID === this.updateCount)
                    this.map[node].setState(state);
            }, timing);
        }
        if (this.autoOn) {
            timing += autoResetSpeed;
            setTimeout(()=>{
                if (!this.comparisonOn && !this.halted && runID === this.updateCount)
                    this.clear();
            }, timing);
        }
        for (let i = 0; i < this.aDraw.length; i += 2) {
            if ((this.mode === visMode.Dijkstra && !this.autoOn) || this.halted) break;
            let node = this.aDraw[i];
            let state = this.aDraw[i+1];
            timing += (state === nodeState.Path2) ? pathAnimationSpeed :
                                                    visitAnimationSpeed;
            setTimeout(()=>{
                if (!this.halted && runID === this.updateCount
                    && !(this.comparisonOn && this.map[node].getState() == nodeState.Path1 
                    && state == nodeState.Visited2))
                    this.map[node].setState(state);
            }, timing);
        }
        setTimeout(()=>{
            if (runID === this.updateCount)
                this.isDrawing = false;
        }, timing+autoResetSpeed);
    }
    public run() {
        console.clear();
        this.isRunning = true;
        if (this.halted) this.halted = false;
        let run = new PathFind;
        this.result = run;
        run.update(this.map, this.startNode, this.endNode);
        this.updateCount++;
        let pathDiff = this.result.dijkstraPath.length - this.result.aStarPath.length;
        let visitDiff = this.result.dijkstraVisit.length - this.result.aStarVisit.length;
        this.totalPathDiff += pathDiff;
        this.totalVisitDiff += visitDiff;
        let avgPath = this.totalPathDiff / this.updateCount;
        let avgVisit = this.totalVisitDiff / this.updateCount;
            console.log("difference: " + pathDiff + " " + visitDiff);
            console.log("average: " + avgPath + " " + avgVisit);
        this.render();
        if (this.autoOn)
            this.auto();
    }
    private render() {
        console.log("rendering result");
        if (!this.result.isDone()) {
            this.renderTimeout(0);
            return;
        }
        let draw = new Array<number>();
        let undraw = new Array<number>();
        for (const node of this.result.dijkstraVisit) {                 // Render Visited tiles
            draw.push(node);
            draw.push(nodeState.Visited1);
            undraw.push(node);
            undraw.push(nodeState.Unvisited);
        }
        if (!this.result.dijkstraPath.length) {                        // Render Unsolveable tiles
            for (const node of this.result.dijkstraVisit) {
                draw.push(node);
                draw.push(nodeState.Unsolvable);
                undraw.push(node);
                undraw.push(nodeState.Visited1);
            }
        }
        else {
            for (const node of this.result.dijkstraPath) {              // Render Path tiles
                draw.push(node);
                draw.push(nodeState.Path1);
                undraw.push(node);
                undraw.push(nodeState.Visited1);
            }
        }
        this.dDraw = draw;
        this.dUndraw = undraw;
        draw = new Array<number>();                                     // Do it again for A*
        undraw = new Array<number>();
        for (const node of this.result.aStarVisit) {
            draw.push(node);
            draw.push(nodeState.Visited2);
            undraw.push(node);
            undraw.push(nodeState.Unvisited);
        }
        if (!this.result.aStarPath.length) {
            for (const node of this.result.aStarVisit) {
                draw.push(node);
                draw.push(nodeState.Unsolvable);
                undraw.push(node);
                undraw.push(nodeState.Visited2);
            }
        }
        else {
            for (const node of this.result.aStarPath) {
                draw.push(node);
                draw.push(nodeState.Path2);
                undraw.push(node);
                undraw.push(nodeState.Visited2)
            }
        }
        this.aDraw = draw;
        this.isRunning = false;
        if (this.autoOn) this.draw();
    }
    private renderTimeout(count) {
        if (this.result.isDone()) this.render();
        else if (count > 20) console.log("timeout: render failed");
        else {
            setTimeout(() => {this.renderTimeout(count+1);}, 500);
        }
    } 
}

// Pathfinding Algorithms and Components: ////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class PathNode {
    public id:number;
    public distance:number = Infinity;
    public cost:number = Infinity;
    public isObstacle:Boolean = false;
    public isVisited:Boolean = false;
    public previous:PathNode = null;
}

class PathFind {
    private dijkstraPath = new Array<number>();
    private dijkstraVisit = new Array<number>();
    private aStarPath = new Array<number>();
    private aStarVisit = new Array<number>();
    private updateCount = 0;
    private grid = new Array<PathNode>();
    private start = null;
    private end = null;
    private done:Boolean = false;
    private dijkstraDone:Boolean = false;
    public getDijkstraPath() { return this.dijkstraPath; }
    public getDijkstraVisit() { return this.dijkstraVisit; }
    public getAStarPath() { return this.aStarPath; }
    public getAStarVisit() { return this.aStarVisit; }
    public isDone() { return this.done; }
    public update(map:Array<visNode>, startNode:number, endNode:number) {
        console.log("calculating paths...");
        this.updateCount++;
        let convNodeID = 0;
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
        this.start = this.grid[startNode];
        this.end = this.grid[endNode];
        this.dijkstra();
        this.runNext();
    }
    private runNext() {
        if (this.dijkstraDone) {
            this.reset();
            this.aStar();
        }
        else setTimeout(() => {this.runNext();}, 0);
    }

    public dijkstra() {
        const visitedNodesInOrder = [];
        const unvisitedNodes = this.getAllNodes();
        while (!!unvisitedNodes.length) {
            this.sortNodesByDistance(unvisitedNodes);
            const closestNode = unvisitedNodes.shift();
            if (closestNode.isObstacle) continue;
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
        this.dijkstraVisit.shift();                                 // remove
        this.dijkstraVisit.pop();
    }
    public aStar() {
        const visitedNodesInOrder = [];
        const unvisitedNodes = this.getAllNodes();
        while (!!unvisitedNodes.length) {
            this.sortNodesByCost(unvisitedNodes);
            const closestNode = unvisitedNodes.shift();
            if (closestNode.isObstacle) continue;
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
    }

    private sortNodesByDistance(unvisitedNodes) {
        unvisitedNodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
    }
    private sortNodesByCost(unvisitedNodes) {
        unvisitedNodes.sort((nodeA, nodeB) => nodeA.cost - nodeB.cost);
    }
    private updateUnvisitedNeighbors(node:PathNode, useHeuristics:boolean) {
        const unvisitedNeighbors = this.getNeighbors(node);
        for (const neighbor of unvisitedNeighbors) {
            neighbor.distance = node.distance+1;
            if (useHeuristics) {
                let estimatedDistance = this.estimateDistance(neighbor.id);
                neighbor.cost = estimatedDistance * heuristicWeight + neighbor.distance;
            }
            neighbor.previous = node;
        }
    }
    private getAllNodes() {
        const nodes = [];
        for (const node of this.grid)
            nodes.push(node);
        return nodes;
    }
    private drawDijkstraPath(end:PathNode) {
        const nodesInShortestPathOrder = [];
        let currentNode = end;
        while (currentNode !== null) {
            nodesInShortestPathOrder.unshift(currentNode);
            currentNode = currentNode.previous;
        }
        for (const node of nodesInShortestPathOrder)
            this.dijkstraPath.push(node.id);
        this.dijkstraPath.shift();                              // remove the start and end nodes
        this.dijkstraPath.pop();
        this.dijkstraDone = true;
        console.log("dijkstra: " + this.dijkstraPath.length + " " + this.dijkstraVisit.length);
    }
    private drawAStarPath(end:PathNode) {
        const nodesInShortestPathOrder = [];
        let currentNode = end;
        while (currentNode !== null) {
            nodesInShortestPathOrder.unshift(currentNode);
            currentNode = currentNode.previous;
        }
        for (const node of nodesInShortestPathOrder)
            this.aStarPath.push(node.id);
        this.aStarPath.shift();                                 // remove the start and end nodes
        this.aStarPath.pop();
        this.done = true;
        console.log("astar: " + this.aStarPath.length + " " + this.aStarVisit.length);
    }
    private estimateDistance(node) {
        let end = this.end.id;
        let current = node;
        let distance = 0;
        while (current%rowSize < end%rowSize) {
            current++;
            distance++;
        }
        while (current%rowSize > end%rowSize) {
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
    let autoCheckbox = document.querySelector('#auto');
    visualizer.autoOn = (autoCheckbox as HTMLInputElement).checked;
}
function comparisons() {
    let comparisonCheckbox = document.querySelector('#compare');
    visualizer.comparisonOn = (comparisonCheckbox as HTMLInputElement).checked;
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
function setSpeed(speed:number) {
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
function newVis(newSize:number) {
    visualizer.div.parentElement.removeChild(visualizer.div);
    if (newSize > 200)
        alert("Running the visualizer on this setting make take a while.");

    let containerSize = '500px';
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

    rowSize = newSize;
    visSize = rowSize*rowSize;
    let root = document.querySelector(':root');
    (root as HTMLElement).style.setProperty('--nodeSize', nodeSize);
    (root as HTMLElement).style.setProperty('--containerSize', containerSize);
    (root as HTMLElement).style.setProperty('--buttonSize', buttonSize);
    visualizer = new Visualizer;
    auto();
    comparisons();
}

// Runtime:                                ///////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let visualizer = new Visualizer;                            // Start the visualizer