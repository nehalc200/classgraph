import json


class ASTNode:
    def __init__(self, code):
        self.code = code

    def __repr__(self):
        return f"{self.__class__.__name__}({self.code})"

    def to_dict(self):
        return {"code": self.code}


class ChildNode(ASTNode):
    def __init__(self, code, children):
        self.code = code
        self.type = "CHILD"
        self.children = children or []

    def to_dict(self):
        return {
            "code": self.code,
            "type": self.type,
            "children": [child.to_dict() for child in self.children],
        }


class RootNode(ASTNode):
    def __init__(self, code, children):
        self.code = code
        self.type = "ROOT"
        self.children = children or []

    def to_dict(self):
        return {
            "code": self.code,
            "type": self.type,
            "children": [child.to_dict() for child in self.children],
        }

