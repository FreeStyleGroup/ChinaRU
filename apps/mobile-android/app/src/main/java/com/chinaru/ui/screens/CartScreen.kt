package com.chinaru.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chinaru.ui.theme.*
import com.chinaru.ui.viewmodels.CartItem
import com.chinaru.ui.viewmodels.CartViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(viewModel: CartViewModel = viewModel()) {
    val cartItems by viewModel.cartItems.collectAsState()
    
    // Реактивный расчет итоговой суммы. Compose автоматически пересчитает её при изменении cartItems
    val totalPrice = cartItems.sumOf { it.price * it.quantity }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Корзина", fontSize = 20.sp, fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SurfaceWhite,
                    titleContentColor = TextMain
                )
            )
        },
        bottomBar = {
            if (cartItems.isNotEmpty()) {
                CartBottomBar(totalPrice = totalPrice)
            }
        },
        containerColor = BackgroundGray
    ) { paddingValues ->
        if (cartItems.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                Text("Ваша корзина пуста", color = TextSecondary, fontSize = 16.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(cartItems) { item ->
                    CartItemCard(
                        item = item,
                        onIncrement = { viewModel.incrementQuantity(item.id) },
                        onDecrement = { viewModel.decrementQuantity(item.id) },
                        onRemove = { viewModel.removeItem(item.id) }
                    )
                }
            }
        }
    }
}

@Composable
fun CartItemCard(
    item: CartItem,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    onRemove: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            // Фотография товара (заглушка)
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFEAEAEA)),
                contentAlignment = Alignment.Center
            ) {
                Text("Фото", color = TextSecondary, fontSize = 12.sp)
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                    Text(
                        text = item.name,
                        fontSize = 14.sp,
                        color = TextMain,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = onRemove, modifier = Modifier.size(24.dp).padding(start = 4.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Удалить", tint = TextSecondary)
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "₽ ${item.price}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = PrimaryRed)
                    
                    // Кнопки + и -
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onDecrement, modifier = Modifier.size(28.dp).background(BackgroundGray, CircleShape)) {
                            Text("-", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextMain)
                        }
                        Text(text = item.quantity.toString(), modifier = Modifier.padding(horizontal = 12.dp), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextMain)
                        IconButton(onClick = onIncrement, modifier = Modifier.size(28.dp).background(BackgroundGray, CircleShape)) {
                            Text("+", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextMain)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CartBottomBar(totalPrice: Int) {
    Surface(color = SurfaceWhite, shadowElevation = 16.dp) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Итого:", fontSize = 14.sp, color = TextSecondary)
                Text(text = "₽ $totalPrice", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = PrimaryRed)
            }
            Button(onClick = { /* TODO */ }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = PrimaryRed), modifier = Modifier.height(48.dp)) {
                Text("Оформить", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SurfaceWhite)
            }
        }
    }
}