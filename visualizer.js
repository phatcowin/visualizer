var rowSize = 10; // Adjust the map size with rowSize
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
var visNode = /** @class */ (function () {
    function visNode() {
        this.state = nodeState.Unvisited;
        this.div = document.createElement('div');
        this.div.className = "vis-node"; // Make them children of the container and assign 
        var visContainer = document.getElementById('vis-container'); // the vis-node class to them
        if (visContainer)
            visContainer.appendChild(this.div);
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
    return visNode;
}());
var Visualizer = /** @class */ (function () {
    function Visualizer() {
        this.map = new Array(); // Create our map
        this.container = document.createElement('div');
        document.body.appendChild(this.container);
        this.container.className = 'map-container';
        this.container.setAttribute('id', 'vis-container');
        for (var i = 0; i < visSize; i++) { // Use the constructor to create visSize
            var newNode = new visNode; // many visNodes and push them to our map
            this.map.push(newNode);
        }
    }
    Visualizer.prototype.clear = function () {
        for (var i = 0; i < visSize; i++) { // Use between different runs on the same map.
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
    Visualizer.prototype.setNode = function (targetNode, value) {
        this.map[targetNode].setState(value);
        // Future Dalton: log all states and sets for slider!
    };
    return Visualizer;
}());
var visualizer = new Visualizer;
visualizer.setNode(90, nodeState.Start);
visualizer.setNode(9, nodeState.End);
