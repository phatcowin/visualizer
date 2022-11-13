const rowSize = 10;                                         // Adjust the map size with rowSize
const visSize = rowSize * rowSize;                          // Map size = rowSize^2

enum nodeState {                                            // Create an enum to reference our node states
    Unvisited,
    Visited,
    Obstacle,
    Start,
    End,
    Path,
}

class visNode {
    private state:nodeState = nodeState.Unvisited;         
    private div = document.createElement('div');
    constructor(visNodeID) {                                // Initialize visNode: 
        this.div.setAttribute('visNodeID', visNodeID);      //      Assign an ID
        this.div.className = "vis-node";                    //      Assign the vis-node class
        let visContainer = document.getElementById('vis-container'); 
        if (visContainer)                                   //      Make sure the container exists
            visContainer.appendChild(this.div);             //      Place the div in the container
        else 
            console.log("Error::visualizer.ts: visNode cannot be constructed without a visContainer");

                                                            // Make each visNode interactive
        this.div.addEventListener("click", (ev: MouseEvent) => {
            let element = ev.target as HTMLElement;         // Use the visNodeID attribute to target nodes
            let targetNode:number = parseInt(element.getAttribute('visNodeID')); 
            if (visualizer.getNode(targetNode) === nodeState.Unvisited)
                visualizer.setNode(targetNode, nodeState.Obstacle);
            else if (visualizer.getNode(targetNode) === nodeState.Obstacle)
                visualizer.setNode(targetNode, nodeState.Unvisited);
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
}

class Visualizer {
    private map = new Array<visNode>();                     // Create our map
    private container = document.createElement('div');
    constructor() {
        document.body.appendChild(this.container);
        this.container.className = 'map-container';
        this.container.setAttribute('id', 'vis-container');
        for (let i = 0; i < visSize; i++) {                 // Use the constructor to create visSize
            let newNode = new visNode(i);                   // many visNodes and push them to our map
            this.map.push(newNode);
        }
    }
    public clear() {                                        // Reset any visited/path nodes, step log.
        for (let i = 0; i < visSize; i++) {                 // Use between different runs on the same map.
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
    public setNode(targetNode:number, value:nodeState) {    // Set the status of a given node
        this.map[targetNode].setState(value);

        // Future Dalton: log all states and sets for slider!
    }
    public getNode(targetNode:number) {
        return this.map[targetNode].getState();
    }
}

function generateTestMap() {
    visualizer.reset();
    visualizer.setNode(73, nodeState.Start);
    visualizer.setNode(18, nodeState.End);
    visualizer.setNode(23, nodeState.Obstacle);
    visualizer.setNode(34, nodeState.Obstacle);
    visualizer.setNode(44, nodeState.Obstacle);
    visualizer.setNode(45, nodeState.Obstacle);
    visualizer.setNode(55, nodeState.Obstacle);
    visualizer.setNode(56, nodeState.Obstacle);
    visualizer.setNode(58, nodeState.Obstacle);
}

function testAnimations() {
    let targetNode = Math.floor(Math.random() * visSize);
    let newState = Math.floor(Math.random() * 6);
    visualizer.setNode(targetNode, newState);
    setTimeout(testAnimations, 100);
}

let visualizer = new Visualizer;                            // Start the visualizer
testAnimations();