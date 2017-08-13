
CSL.NameOutput.prototype.isPerson = function (value) {
    if (value.literal
        || (!value.given && value.family && value.isInstitution)) {
        
        return false;
    } else {
        return true;
    }
};
