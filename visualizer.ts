// Config:                               //////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let rowSize = 50;                                           // Adjust the map size with rowSize
let visSize = rowSize * rowSize;                            // Map size = rowSize^2
let visitAnimationSpeed = 1;
let pathAnimationSpeed = 20;
let autoResetSpeed = 1000;
let pathfindSpeed = 5000;                                  // How long does pathfinding take???
let showNodeNumber = false;

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
    public result:any;
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
    }
    public auto() {
        if (!this.isRunning) {
            this.isRunning = true;
            visualizer.reset();                             // Create a fresh maze
            visualizer.generateTest();
            console.clear();
            setTimeout(() => {visualizer.run();},0);        // Crashes without the timeout for some reason
            this.auto();
        }
        if (this.isRunning) {
            setTimeout(() => { this.auto(); }, 500);
        }
    }

    private draw(result:PathFind) {
        let dVisited = result.getDijkstraVisit();
        let dPath = result.getDijkstraPath();
        let aVisited = result.getAStarVisit();
        let aPath = result.getAStarPath();
        let timing:number = 0;
        for (const node of dVisited) {
            setTimeout(() => {
                if (node !== this.startNode && node !== this.endNode)
                    this.map[node].setState(nodeState.Visited1);
            }, timing);
            timing += visitAnimationSpeed;
        }
        if (dPath.length < 1) {
            setTimeout(() => {
                for (const node of dVisited) {
                    if (node !== this.startNode && node !== this.endNode)
                    this.map[node].setState(nodeState.Unsolvable);
                }
            }, timing);
        }
        else {
            for (const node of dPath) {
                setTimeout(() => {
                    if (node !== this.startNode && node !== this.endNode)
                        this.map[node].setState(nodeState.Path1);
                }, timing);
                timing += pathAnimationSpeed;
            }
            timing += autoResetSpeed;
        }
        timing += autoResetSpeed;
        for (const node of aVisited) {
            setTimeout(() => {
                if (node !== this.startNode && node !== this.endNode && this.map[node].getState() !== nodeState.Path1)
                    this.map[node].setState(nodeState.Visited2);
            }, timing);
            timing += visitAnimationSpeed;
        }
        if (aPath.length < 1) {
            setTimeout(() => {
                for (const node of aVisited) {
                    if (node !== this.startNode && node !== this.endNode)
                    this.map[node].setState(nodeState.Unsolvable);
                }
            }, timing);
        }
        else {
            for (const node of aPath) {
                setTimeout(() => {
                    if (node !== this.startNode && node !== this.endNode)
                        this.map[node].setState(nodeState.Path2);
                }, timing);
                timing += pathAnimationSpeed;
            }
        }
        
        setTimeout(() => { this.isRunning = false; }, timing + autoResetSpeed);
    }
    public run() {
        this.isRunning = true;
        let run = new PathFind;
        this.result = run;
        run.update(this.map, this.startNode, this.endNode);
        this.render();
    }
    private render() {
        console.log("rendering result");
        if (this.result.isDone()) {
            this.draw(this.result);
        }
        else 
            this.renderTimeout(0);
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
    private diffPathTotal = 0;
    private diffVisitTotal = 0;
    private diffPathAvg = 0;
    private diffVisitAvg = 0;
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
        if (this.dijkstraDone && this.dijkstraPath.length > 0) {
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
    }
    public aStar() {
        const visitedNodesInOrder = [];
        const unvisitedNodes = this.getAllNodes();
        while (!!unvisitedNodes.length) {
            this.sortNodesByCost(unvisitedNodes);
            const closestNode = unvisitedNodes.shift();
            if (closestNode.isObstacle) continue;
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
    }

    private sortNodesByDistance(unvisitedNodes) {
        unvisitedNodes.sort((nodeA, nodeB) => nodeA.distance - nodeB.distance);
    }
    private sortNodesByCost(unvisitedNodes) {
        unvisitedNodes.sort((nodeA, nodeB) => nodeA.cost - nodeB.cost);
    }
    private updateUnvisitedNeighbors(node) {
        const unvisitedNeighbors = this.getNeighbors(node);
        for (const neighbor of unvisitedNeighbors) {
            neighbor.distance = node.distance+1;
            neighbor.cost = neighbor.distance + this.estimateDistance(neighbor.id);
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
        this.dijkstraDone = true;
        console.log("dijkstra: " + this.dijkstraPath.length + " " + this.dijkstraVisit.length);
    }
    private drawAStarPath(end) {
        const nodesInShortestPathOrder = [];
        let currentNode = end;
        while (currentNode !== null) {
            nodesInShortestPathOrder.unshift(currentNode);
            currentNode = currentNode.previous;
        }
        for (const node of nodesInShortestPathOrder)
            this.aStarPath.push(node.id);
        this.done = true;
        console.log("astar: " + this.aStarPath.length + " " + this.aStarVisit.length);
        let diffPath = this.dijkstraPath.length - this.aStarPath.length;
        let diffVisit = this.dijkstraVisit.length - this.aStarVisit.length;
        this.diffPathTotal += diffPath;
        this.diffVisitTotal += diffVisit;
        this.diffPathAvg = this.diffPathTotal / this.updateCount;
        this.diffVisitAvg = this.diffVisitTotal / this.updateCount;
        console.log("difference: " + diffPath + " " + diffVisit);
        console.log("average: " + this.diffPathAvg + " " + this.diffVisitAvg);
    }
    private estimateDistance(node) {
        let end = this.end.id;
        let location = node.id;
        let distance = 0;
        let x = 0;
        let y = 0;
        while (location > rowSize) {
            location -= rowSize;
            x++;
        }
        while (end > rowSize) {
            end -= rowSize;
            y++;
        }
        distance += Math.abs(x-y);
        x = 0;
        y = 0;
        while (location > 0) {
            location -= 1;
            x++;
        }
        while (end > 0) {
            end -= 1
            y++;
        }
        distance += Math.abs(x-y);
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

// Runtime: //////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let visualizer = new Visualizer;                            // Start the visualizer
visualizer.auto();