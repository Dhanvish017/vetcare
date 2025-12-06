/*const Pet = require('../models/Pet');
const { validationResult } = require('express-validator');

// @desc    Create a new pet
// @route   POST /api/pets
// @access  Private
const createPet = async (req, res) => {
    try {
        // Input validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, species, breed, age, gender, owner } = req.body;
        
        // Create new pet
        const newPet = new Pet({
            name,
            species,
            breed,
            age,
            gender,
            owner: req.user.id // Assuming you have user authentication
        });

        const savedPet = await newPet.save();
        res.status(201).json(savedPet);
    } catch (error) {
        console.error('Error creating pet:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all pets
// @route   GET /api/pets
// @access  Private
const getAllPets = async (req, res) => {
    try {
        const pets = await Pet.find().populate('owner', ['name', 'email']);
        res.json(pets);
    } catch (error) {
        console.error('Error fetching pets:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single pet by ID
// @route   GET /api/pets/:id
// @access  Private
const getPetById = async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id).populate('owner', ['name', 'email']);
        
        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }
        
        res.json(pet);
    } catch (error) {
        console.error('Error fetching pet:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Pet not found' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update a pet
// @route   PUT /api/pets/:id
// @access  Private
const updatePet = async (req, res) => {
    try {
        // Input validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, species, breed, age, gender } = req.body;
        
        // Build pet object
        const petFields = {};
        if (name) petFields.name = name;
        if (species) petFields.species = species;
        if (breed) petFields.breed = breed;
        if (age) petFields.age = age;
        if (gender) petFields.gender = gender;

        let pet = await Pet.findById(req.params.id);

        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }

        // Make sure user owns the pet
        if (pet.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        pet = await Pet.findByIdAndUpdate(
            req.params.id,
            { $set: petFields },
            { new: true, runValidators: true }
        );

        res.json(pet);
    } catch (error) {
        console.error('Error updating pet:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a pet
// @route   DELETE /api/pets/:id
// @access  Private
const deletePet = async (req, res) => {
    try {
        const pet = await Pet.findById(req.params.id);

        if (!pet) {
            return res.status(404).json({ message: 'Pet not found' });
        }

        // Make sure user owns the pet
        if (pet.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await pet.remove();
        res.json({ message: 'Pet removed' });
    } catch (error) {
        console.error('Error deleting pet:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Pet not found' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createPet,
    getAllPets,
    getPetById,
    updatePet,
    deletePet
};*/