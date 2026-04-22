package com.medsafe;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MedsafeApplication {

    public static void main(String[] args) {
        SpringApplication.run(MedsafeApplication.class, args);
    }
}
