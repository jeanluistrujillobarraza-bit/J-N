package com.jyn.store.repository;

import com.jyn.store.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    List<Product> findByCategoryIgnoreCase(String category);
    List<Product> findByTypeIgnoreCase(String type);
    
    @Query("{ '$or': [ { 'name': { '$regex': ?0, '$options': 'i' } }, { 'description': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Product> searchByNameOrDescription(String keyword);
    
    @Query("{ 'category': ?0, '$or': [ { 'name': { '$regex': ?1, '$options': 'i' } }, { 'description': { '$regex': ?1, '$options': 'i' } } ] }")
    List<Product> searchByCategoryAndKeyword(String category, String keyword);

    @Query("{ 'type': { '$regex': ?0, '$options': 'i' }, '$or': [ { 'name': { '$regex': ?1, '$options': 'i' } }, { 'description': { '$regex': ?1, '$options': 'i' } } ] }")
    List<Product> searchByTypeAndKeyword(String type, String keyword);
}
