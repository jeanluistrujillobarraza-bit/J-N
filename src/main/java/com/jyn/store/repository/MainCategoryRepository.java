package com.jyn.store.repository;

import com.jyn.store.model.MainCategory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MainCategoryRepository extends MongoRepository<MainCategory, String> {
    Optional<MainCategory> findByNameIgnoreCase(String name);
}
