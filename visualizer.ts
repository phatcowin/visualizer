// Config:                               //////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let rowSize:number = 50;                                    // Adjust the map size with rowSize
let visSize:number = rowSize * rowSize;                     // Map size = rowSize^2
let visitAnimationSpeed:number = 1;
let pathAnimationSpeed:number = 20;
let autoResetSpeed:number = 1000;
let heuristicWeight:number = 2;                             // Set the weight for A*'s heuristic component
let heuristicIsExponent:boolean = false;
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
    Auto,
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
    private halted:boolean = false;
    private inputMode:nodeState = nodeState.Obstacle;       // When a user clicks, what are they trying to place?
    public result:any;
    private current:number = 0;
    private autoTimeout:number = 1;
    private totalPathDiff:number = 0;
    private totalVisitDiff:number = 0;
    private updateCount:number = 0;

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
            if (state == nodeState.Path1 || 
                state == nodeState.Path2 || 
                state == nodeState.Visited1 || 
                state == nodeState.Visited2)
                node.setState(nodeState.Unvisited);
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
        this.halted = true;
    }
    public auto() {
        if (!this.isRunning && !this.halted) {
            this.isRunning = true;
            visualizer.reset();                             // Create a fresh maze
            visualizer.generateTest();
            setTimeout(() => {visualizer.run();},0);        // Crashes without the timeout for some reason
            this.auto();
        }
        if (this.isRunning) {
            setTimeout(() => { this.auto(); }, 500);
        }
    }

    public draw2(target:number) {
        let dVisit = this.result.getDijkstraVisit();                        // Get our paths
        let dPath = this.result.getDijkstraPath();
        let aVisit = this.result.getAStarVisit();
        let aPath = this.result.getAStarPath();
        let dVisitThreshold = dVisit.length;                                // Relate our target to the correct arrays
        let dPathThreshold = dPath.length + dVisitThreshold;
        let aVisitThreshold = aVisit.length + dPathThreshold;
        let end = aPath.length + aVisitThreshold;
        let current = this.current;                                         // Create an iterator based on where we are
        let timing = 1;                                                     // Make sure our animations occur in time
        if (current < target) {
            while (current < target) {
                let timeout = timing;
                let state:nodeState = 0;
                let node:number = current;
                (current < dVisitThreshold) ?                               // ternary fun! select our animation speed &
                    (timeout*=visitAnimationSpeed, node=dVisit[node], state=nodeState.Visited1) :   // target node/state
                (current < dPathThreshold) ?                                // based on the thresholds current has crossed
                    (timeout*=pathAnimationSpeed, node=dPath[node-dVisitThreshold], state=nodeState.Path1) :
                (current < aVisitThreshold) ? 
                    (timeout*=visitAnimationSpeed, node=aVisit[node-dPathThreshold], state=nodeState.Visited2) :
                    (timeout*=pathAnimationSpeed, node=aPath[node-aVisitThreshold], state=nodeState.Path2);
                setTimeout(() => {
                    if (current > 0 && current < end)                       // dont draw over our start/end nodes
                        this.map[node].setState(state);
                }, timeout);
                timing++;
                current++;
            }
        }
        else {
            while (current > target) {
                let timeout = timing;
                let state:nodeState = 0;
                (current < dVisitThreshold) ? (timeout*=visitAnimationSpeed, state=nodeState.Unvisited) :
                    (current < dPathThreshold) ? (timeout*=pathAnimationSpeed, state=nodeState.Visited1) :
                    (current < aVisitThreshold) ? (timeout*=visitAnimationSpeed, state=nodeState.Visited1) :
                    (timeout*=pathAnimationSpeed, state=nodeState.Visited2);
                setTimeout(() => {
                    if (current > 0 && current < end)
                        this.map[current].setState(state);
                }, timeout);
                if (timing == aVisitThreshold) {
                    for (let i = 0; i < dPath.length; i++)
                        this.map[i].setState(nodeState.Path1);
                }
                timing++;
                current--;
            }
        }
        this.current = current;                                             // Update the visualizer's current step
    }
    private draw(result:PathFind) {
        let dVisited = result.getDijkstraVisit();
        let dPath = result.getDijkstraPath();
        let aVisited = result.getAStarVisit();
        let aPath = result.getAStarPath();
        let timing:number = 0;
        if (this.mode == visMode.Dijkstra || this.mode == visMode.Auto) {
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
            }
        }
        if (this.mode == visMode.AStar || this.mode == visMode.Auto) {
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
        }
        setTimeout(() => { this.isRunning = false; }, timing + autoResetSpeed);
    }
    public run() {
        console.clear();
        this.isRunning = true;
        if (this.halted) {
            this.halted = false;
        }
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
            this.updateUnvisitedNeighbors(closestNode, true);
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
            this.updateUnvisitedNeighbors(closestNode, true);
        }
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
            let distance = node.distance + 1;
            neighbor.cost = distance;
            if (useHeuristics) {
                let estimatedDistance = this.estimateDistance(neighbor.id);
                neighbor.cost += (heuristicIsExponent) ? Math.pow(estimatedDistance, heuristicWeight) :
                                 estimatedDistance * heuristicWeight;
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
        this.done = true;
        console.log("astar: " + this.aStarPath.length + " " + this.aStarVisit.length);
    }
    private estimateDistance(node) {
        let end = this.end.id;
        let current = node.id;
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
    visualizer.run();
}
function halt() {
    visualizer.stop();
}
function auto() {
    visualizer.setMode(visMode.Auto);
    visualizer.auto();
}
function dijkstra() {
    visualizer.setMode(visMode.Dijkstra);
}
function aStar() {
    visualizer.setMode(visMode.AStar);
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

    
    let nodeSize = (newSize == 5) ? '200px' :
                   (newSize == 10) ? '100px' :
                   (newSize == 50) ? '20px' :
                   (newSize == 100) ? '10px':
                   '2px';
    rowSize = newSize;
    visSize = rowSize*rowSize;
    let root = document.querySelector(':root');
    (root as HTMLElement).style.setProperty('--nodeSize', nodeSize);
    visualizer = new Visualizer;
}

// Runtime:                                ///////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let visualizer = new Visualizer;                            // Start the visualizer