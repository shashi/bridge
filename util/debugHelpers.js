// Simple reflection
//
Debug = {};

Debug.getProperties = function (obj) {
    list = [];
    for (p in obj) {
        if (obj.hasOwnProperty(p)) {
            list.push({name: p,
                       type: typeof(obj[p])}
            );
        }
    }
    return list;
}

Debug.getMethods = function (obj) {
    return _.where(Debug.getProperties(obj), {type: "function"});
}

Debug.getNonMethods = function (obj) {
    return _.filter(Debug.getProperties(obj), function (p) { return p.type != "function" });
}

Debug.makeUMLClass = function(attribs, methods, className) {

    if (attribs.length == 0 && methods.length == 0) {
        return "[" + className + "]";
    }
    if (typeof(attribs[0]) == "object") {
        attribs = _.map(attribs, function (e) {
            return "+" + e.name + " : " + e.type;
        });
    }
    if (typeof(methods[0]) == "object") {
        methods = _.map(methods, function (e) {
            return "+" +e.name + "()";
        });
    }

    return "\n\n" + className + "\n\n" +
            attribs.join("\n") + "\n======\n" +
            methods.join("\n");
}

Debug.getUML = function (obj, className) {
    if (!className) { className = "Class"; }

    // presents you a UML diagram for the object
    var uml = Debug.makeUMLClass(Debug.getNonMethods(obj), Debug.getMethods(obj), className);
    return uml;
            
}

Debug.getClassDiagram = function () {

    var uml = "";

    // Game class
    var game = new Game(Template.game.game());

    uml += Debug.getUML(game, "Game");

    uml += "[Template|+_tmpl_data : object|+events();+preserve();+helpers()],";

    // Template class
    var templates = _.map(_.filter(Debug.getProperties(Template), function (t) { return t.name[0] != '_'; }), function (t) { return t.name });
    templates = _.difference(templates, ["top-bar", "visitor", "intro"]);

    function ucfirst(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1);
    }

    function getTemplateUML(obj, className) {
        var attribs = _.filter(Debug.getNonMethods(obj), function (e) { return "_tmpl_data" != e.name; }),
            methods = _.filter(Debug.getMethods(obj), function (e) { return ["events", "preserve", "helpers"].indexOf(e.name) < 0; });

        return Debug.makeUMLClass(attribs, methods, className);
    }

    for (var i=0, l = templates.length; i < l; i++) {
        var sub = templates[i];
        if (sub == "game") sub = "CurrentGame";

        uml += getTemplateUML(Template[templates[i]], ucfirst(sub));
        uml += ",[Template]<>--[" + ucfirst(sub) + "],"
    }

    return uml;
}
