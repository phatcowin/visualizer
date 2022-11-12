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
    constructor() {                                         // Use the constructor to initialize our visNode 
        this.div.className = "vis-node";                     // Make them children of the container and assign 
        let visContainer = document.getElementById('vis-container'); // the vis-node class to them
        if (visContainer) visContainer.appendChild(this.div);
    }       
    public getState() { return this.state; }
    public setState(newState:nodeState) {                  // When we set the node state, update the div color
        this.state = newState;
        if (newState === nodeState.Unvisited) 
            this.div.setAttribute('background-color', 'var(--unvisited)');
        else if (newState === nodeState.Visited)
            this.div.setAttribute('background-color', 'var(--visited)');
        else if (newState === nodeState.Obstacle)
            this.div.setAttribute('background-color', 'var(--obstacle)');
        else if (newState === nodeState.Start)
            this.div.setAttribute('background-color', 'var(--start)');
        else if (newState === nodeState.End)
            this.div.setAttribute('background-color', 'var(--start)');
        else if (newState === nodeState.Path)
            this.div.setAttribute('background-color', 'var(--path)');
    }
}

class Visualizer {
    private map = new Array<visNode>();                     // Create our map
    private container = document.createElement('div');
    constructor() {
        this.container.className = 'map-container';
        this.container.setAttribute('id', 'vis-container');
        for (let i = 0; i < visSize; i++) {                 // Use the constructor to create visSize
            let newNode = new visNode;                      // many visNodes and push them to our map
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
    public setNode(targetNode, value:nodeState) {           // Set the status of a given node
        this.map[targetNode].setState(value);

        // Future Dalton: log all states and sets for slider!
    }
}

let visualizer = new Visualizer;