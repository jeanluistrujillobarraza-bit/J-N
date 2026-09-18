package com.jyn.store.repository;

import com.jyn.store.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    @Query("{ 'deleted': { '$ne': true } }")
    List<Product> findActiveProducts();

    @Query("{ 'deleted': true }")
    List<Product> findDeletedProducts();
    
    @Query("{ 'deleted': { '$ne': true }, '$or': [ { 'name': { '$regex': ?0, '$options': 'i' } }, { 'description': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Product> searchByNameOrDescription(String keyword);

    @Query("{ 'deleted': { '$ne': true }, '$or': [ { 'category': { '$regex': ?0, '$options': 'i' } }, { 'type': { '$regex': ?0, '$options': 'i' } } ] }")
    List<Product> findByCategoryOrTypeIgnoreCase(String categoryOrType);

    @Query("{ 'deleted': { '$ne': true }, '$and': [ { '$or': [ { 'category': { '$regex': ?0, '$options': 'i' } }, { 'type': { '$regex': ?0, '$options': 'i' } } ] }, { '$or': [ { 'name': { '$regex': ?1, '$options': 'i' } }, { 'description': { '$regex': ?1, '$options': 'i' } } ] } ] }")
    List<Product> searchByCategoryOrTypeAndKeyword(String categoryOrType, String keyword);
}
