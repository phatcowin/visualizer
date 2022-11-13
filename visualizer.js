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
    function visNode(visNodeID) {
        this.state = nodeState.Unvisited;
        this.div = document.createElement('div');
        this.div.setAttribute('visNodeID', visNodeID); //      Assign an ID
        this.div.className = "vis-node"; //      Assign the vis-node class
        var visContainer = document.getElementById('vis-container');
        if (visContainer) //      Make sure the container exists
            visContainer.appendChild(this.div); //      Place the div in the container
        else
            console.log("Error::visualizer.ts: visNode cannot be constructed without a visContainer");
        // Make each visNode interactive
        this.div.addEventListener("click", function (ev) {
            var element = ev.target; // Use the visNodeID attribute to target nodes
            var targetNode = parseInt(element.getAttribute('visNodeID'));
            if (visualizer.getNode(targetNode) === nodeState.Unvisited)
                visualizer.setNode(targetNode, nodeState.Obstacle);
            else if (visualizer.getNode(targetNode) === nodeState.Obstacle)
                visualizer.setNode(targetNode, nodeState.Unvisited);
        });
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
            var newNode = new visNode(i); // many visNodes and push them to our map
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
    Visualizer.prototype.getNode = function (targetNode) {
        return this.map[targetNode].getState();
    };
    return Visualizer;
}());
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
    var targetNode = Math.floor(Math.random() * visSize);
    var newState = Math.floor(Math.random() * 6);
    visualizer.setNode(targetNode, newState);
    setTimeout(testAnimations, 100);
}
var visualizer = new Visualizer; // Start the visualizer
testAnimations();
